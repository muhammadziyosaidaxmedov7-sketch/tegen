import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { telegramSend } from './notify';

@Controller('messages')
export class MessageController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('incoming')
  async incoming(
    @Body()
    body: {
      telegramId: string;
      text?: string;
      fileUrl?: string;
      orderId?: number;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        telegramId: String(body.telegramId),
      },
    });

    if (!user) {
      throw new Error('Foydalanuvchi topilmadi');
    }

    return this.prisma.message.create({
      data: {
        userId: user.id,
        orderId: body.orderId
          ? Number(body.orderId)
          : null,
        text: body.text || null,
        fileUrl: body.fileUrl || null,
        isFromUser: true,
      },
      include: {
        user: true,
        order: true,
      },
    });
  }

  @Get('order/:orderId')
  async orderMessages(
    @Param('orderId') orderId: string,
  ) {
    return this.prisma.message.findMany({
      where: {
        orderId: Number(orderId),
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        user: true,
      },
    });
  }

  @Get('user/:telegramId')
  async userMessages(
    @Param('telegramId') telegramId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        telegramId: String(telegramId),
      },
    });

    if (!user) {
      throw new Error('Foydalanuvchi topilmadi');
    }

    return this.prisma.message.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        order: true,
      },
    });
  }

  @Post('reply')
  async reply(
    @Body()
    body: {
      telegramId: string;
      text: string;
      orderId?: number;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        telegramId: String(body.telegramId),
      },
    });

    if (!user) {
      throw new Error('Foydalanuvchi topilmadi');
    }

    const message = await this.prisma.message.create({
      data: {
        userId: user.id,
        orderId: body.orderId
          ? Number(body.orderId)
          : null,
        text: body.text,
        isFromUser: false,
      },
    });

    await telegramSend(
      user.telegramId,
      `👨‍💼 Admin:\n\n${body.text}`,
    );

    return message;
  }
  }
