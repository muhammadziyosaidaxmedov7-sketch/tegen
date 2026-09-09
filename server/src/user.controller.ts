import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('users')
export class UserController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('upsert')
  upsert(@Body() body: any) {
    return this.prisma.user.upsert({
      where: { telegramId: body.telegramId },
      update: {
        firstName: body.firstName,
        lastName: body.lastName,
        username: body.username,
        phone: body.phone,
      },
      create: {
        telegramId: body.telegramId,
        firstName: body.firstName,
        lastName: body.lastName,
        username: body.username,
        phone: body.phone,
      },
    });
  }

  @Get(':telegramId')
  get(@Param('telegramId') telegramId: string) {
    return this.prisma.user.findUnique({
      where: { telegramId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: true,
          },
        },
      },
    });
  }

  @Get()
  list() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });
  }
}
