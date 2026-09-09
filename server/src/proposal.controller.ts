import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { PrismaService } from './prisma.service';

@Controller('proposals')
export class ProposalController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async create(
    @Body()
    body: {
      telegramId: string;
      categoryId: number;
      productId?: number;
      action: 'CREATE' | 'UPDATE' | 'DELETE';
      name?: string;
      description?: string;
      price?: number;
      oldPrice?: number;
      image?: string;
      analysis?: string;
    },
  ) {
    const worker = await this.prisma.worker.findUnique({
      where: {
        telegramId: String(body.telegramId),
      },
    });

    if (!worker || !worker.isActive) {
      throw new ForbiddenException(
        'Siz worker sifatida biriktirilmagansiz',
      );
    }

    if (worker.categoryId !== Number(body.categoryId)) {
      throw new ForbiddenException(
        'Sizga bu kategoriya biriktirilmagan',
      );
    }

    if (
      body.action === 'UPDATE' ||
      body.action === 'DELETE'
    ) {
      if (!body.productId) {
        throw new ForbiddenException(
          'Mahsulot ID kerak',
        );
      }

      const product =
        await this.prisma.product.findUnique({
          where: {
            id: Number(body.productId),
          },
        });

      if (
        !product ||
        product.categoryId !== worker.categoryId
      ) {
        throw new ForbiddenException(
          'Bu mahsulot sizning kategoriyangizga tegishli emas',
        );
      }
    }

    return this.prisma.productProposal.create({
      data: {
        workerId: worker.id,
        categoryId: worker.categoryId,
        productId: body.productId
          ? Number(body.productId)
          : null,
        action: body.action,
        name: body.name,
        description: body.description,
        price:
          body.price !== undefined
            ? Number(body.price)
            : null,
        oldPrice:
          body.oldPrice !== undefined
            ? Number(body.oldPrice)
            : null,
        image: body.image,
        analysis: body.analysis,
      },
      include: {
        worker: true,
        category: true,
        product: true,
      },
    });
  }

  @Get('worker/:telegramId')
  async workerProposals(
    @Param('telegramId') telegramId: string,
  ) {
    const worker = await this.prisma.worker.findUnique({
      where: {
        telegramId: String(telegramId),
      },
    });

    if (!worker) {
      throw new ForbiddenException(
        'Worker topilmadi',
      );
    }

    return this.prisma.productProposal.findMany({
      where: {
        workerId: worker.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        category: true,
        product: true,
      },
    });
  }

  @Get()
  async all() {
    return this.prisma.productProposal.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        worker: true,
        category: true,
        product: true,
      },
    });
  }

  @Get(':id')
  async one(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.prisma.productProposal.findUnique({
      where: {
        id,
      },
      include: {
        worker: true,
        category: true,
        product: true,
      },
    });
  }
      }
