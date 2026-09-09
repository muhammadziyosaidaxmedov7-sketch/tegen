import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  async stats() {
    const [orders, products, users, revenue] =
      await Promise.all([
        this.prisma.order.count(),
        this.prisma.product.count({
          where: { isActive: true },
        }),
        this.prisma.user.count(),
        this.prisma.order.aggregate({
          _sum: { total: true },
          where: {
            status: {
              in: ['ACCEPTED', 'PREPARING', 'READY'],
            },
          },
        }),
      ]);

    const status = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
      orderBy: {
        status: 'asc',
      },
    });

    return {
      orders,
      products,
      users,
      revenue: revenue._sum.total || 0,
      status,
    };
  }

  @Get('orders')
  async orders() {
    return this.prisma.order.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: true,
        items: true,
      },
    });
  }

  @Patch('orders/:id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    const allowed = [
      'NEW',
      'ACCEPTED',
      'PREPARING',
      'READY',
      'CANCELLED',
    ];

    if (!allowed.includes(body.status)) {
      throw new Error('Noto‘g‘ri status');
    }

    return this.prisma.order.update({
      where: {
        id: Number(id),
      },
      data: {
        status: body.status as any,
      },
      include: {
        user: true,
        items: true,
      },
    });
  }

  @Get('proposals')
  async proposals() {
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

  @Post('proposals/:id/approve')
  async approveProposal(
    @Param('id') id: string,
  ) {
    const proposal =
      await this.prisma.productProposal.findUnique({
        where: {
          id: Number(id),
        },
      });

    if (!proposal) {
      throw new Error('Taklif topilmadi');
    }

    if (proposal.status !== 'PENDING') {
      throw new Error('Bu taklif allaqachon ko‘rib chiqilgan');
    }

    if (proposal.action === 'CREATE') {
      if (!proposal.name || proposal.price == null) {
        throw new Error('Mahsulot ma’lumotlari to‘liq emas');
      }

      await this.prisma.product.create({
        data: {
          categoryId: proposal.categoryId,
          name: proposal.name,
          description: proposal.description,
          price: proposal.price,
          oldPrice: proposal.oldPrice,
          image: proposal.image,
          isActive: true,
        },
      });
    }

    if (proposal.action === 'UPDATE') {
      if (!proposal.productId) {
        throw new Error('Mahsulot ID mavjud emas');
      }

      await this.prisma.product.update({
        where: {
          id: proposal.productId,
        },
        data: {
          ...(proposal.name !== null
            ? { name: proposal.name }
            : {}),
          ...(proposal.description !== null
            ? { description: proposal.description }
            : {}),
          ...(proposal.price !== null
            ? { price: proposal.price }
            : {}),
          ...(proposal.oldPrice !== null
            ? { oldPrice: proposal.oldPrice }
            : {}),
          ...(proposal.image !== null
            ? { image: proposal.image }
            : {}),
        },
      });
    }

    if (proposal.action === 'DELETE') {
      if (!proposal.productId) {
        throw new Error('Mahsulot ID mavjud emas');
      }

      await this.prisma.product.update({
        where: {
          id: proposal.productId,
        },
        data: {
          isActive: false,
        },
      });
    }

    return this.prisma.productProposal.update({
      where: {
        id: proposal.id,
      },
      data: {
        status: 'APPROVED',
      },
    });
  }

  @Post('proposals/:id/reject')
  async rejectProposal(
    @Param('id') id: string,
  ) {
    return this.prisma.productProposal.update({
      where: {
        id: Number(id),
      },
      data: {
        status: 'REJECTED',
      },
    });
  }

  @Get('workers')
  async workers() {
    return this.prisma.worker.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        category: true,
        proposals: true,
      },
    });
  }

  @Post('workers')
  async createWorker(
    @Body()
    body: {
      telegramId: string;
      name?: string;
      categoryId: number;
    },
  ) {
    return this.prisma.worker.create({
      data: {
        telegramId: String(body.telegramId),
        name: body.name,
        categoryId: Number(body.categoryId),
        isActive: true,
      },
      include: {
        category: true,
      },
    });
  }

  @Patch('workers/:id')
  async updateWorker(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      categoryId?: number;
      isActive?: boolean;
    },
  ) {
    return this.prisma.worker.update({
      where: {
        id: Number(id),
      },
      data: {
        ...(body.name !== undefined
          ? { name: body.name }
          : {}),
        ...(body.categoryId !== undefined
          ? { categoryId: Number(body.categoryId) }
          : {}),
        ...(body.isActive !== undefined
          ? { isActive: body.isActive }
          : {}),
      },
      include: {
        category: true,
      },
    });
  }

  @Delete('workers/:id')
  async deleteWorker(
    @Param('id') id: string,
  ) {
    return this.prisma.worker.update({
      where: {
        id: Number(id),
      },
      data: {
        isActive: false,
      },
    });
  }

  @Get('analytics')
  async analytics() {
    const orders = await this.prisma.order.findMany({
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const accepted = orders.filter(
      (o) =>
        o.status === 'ACCEPTED' ||
        o.status === 'PREPARING' ||
        o.status === 'READY',
    );

    const cancelled = orders.filter(
      (o) => o.status === 'CANCELLED',
    );

    const revenue = accepted.reduce(
      (sum, order) => sum + order.total,
      0,
    );

    const productMap = new Map<
      string,
      {
        productId: number;
        name: string;
        quantity: number;
        revenue: number;
      }
    >();

    for (const order of accepted) {
      for (const item of order.items) {
        const key = String(item.productId);
        const current = productMap.get(key) || {
          productId: item.productId,
          name: item.name,
          quantity: 0,
          revenue: 0,
        };

        current.quantity += item.quantity;
        current.revenue += item.total;

        productMap.set(key, current);
      }
    }

    const products = [...productMap.values()].sort(
      (a, b) => b.quantity - a.quantity,
    );

    return {
      totalOrders: orders.length,
      acceptedOrders: accepted.length,
      cancelledOrders: cancelled.length,
      revenue,
      products,
    };
  }
}
