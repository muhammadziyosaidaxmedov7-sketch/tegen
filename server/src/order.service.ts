import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { telegramSend } from './notify';

const STATUSES = [
  'NEW',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'CANCELLED',
];

const statusText: Record<string, string> = {
  NEW: 'Yangi',
  ACCEPTED: 'Qabul qilindi',
  PREPARING: 'Tayyorlanmoqda',
  READY: 'Tayyor',
  CANCELLED: 'Bekor qilindi',
};

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async createOrder(body: {
    telegramId: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    phone?: string;
    items: {
      productId: number;
      quantity: number;
    }[];
  }) {
    if (!body.telegramId || !body.items?.length) {
      throw new BadRequestException('Mahsulotlar tanlanmagan');
    }

    const user = await this.prisma.user.upsert({
      where: {
        telegramId: body.telegramId,
      },
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

    const ids = [
      ...new Set(
        body.items.map((item) => Number(item.productId)),
      ),
    ];

    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: ids,
        },
        isActive: true,
      },
    });

    if (products.length !== ids.length) {
      throw new BadRequestException(
        'Mahsulotlardan biri mavjud emas',
      );
    }

    const rows = body.items.map((item) => {
      const product = products.find(
        (p) => p.id === Number(item.productId),
      );

      if (!product) {
        throw new BadRequestException(
          'Mahsulot topilmadi',
        );
      }

      const quantity = Math.max(
        1,
        Math.floor(Number(item.quantity)),
      );

      return {
        productId: product.id,
        name: product.name,
        quantity,
        price: product.price,
        total: product.price * quantity,
      };
    });

    const total = rows.reduce(
      (sum, item) => sum + item.total,
      0,
    );

    const orderNumber = `TG-${Date.now()
      .toString()
      .slice(-8)}`;

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        total,
        phone: body.phone,
        userId: user.id,
        items: {
          create: rows.map((item) => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
          })),
        },
      },
      include: {
        user: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    await telegramSend(
      user.telegramId,
      [
        '🛍 Buyurtma qabul qilindi!',
        '',
        `№ ${order.orderNumber}`,
        `💰 ${total.toLocaleString('uz-UZ')} so‘m`,
        '📦 Holat: Yangi',
      ].join('\n'),
    );

    return order;
  }

  async getOrders() {
    return this.prisma.order.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: true,
        items: {
          include: {
            product: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  async getOrder(id: number) {
    return this.prisma.order.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
        items: {
          include: {
            product: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  async updateStatus(
    id: number,
    status: string,
  ) {
    if (!STATUSES.includes(status)) {
      throw new BadRequestException(
        'Noto‘g‘ri status',
      );
    }

    const order = await this.prisma.order.update({
      where: {
        id,
      },
      data: {
        status: status as any,
      },
      include: {
        user: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    await telegramSend(
      order.user.telegramId,
      [
        `📦 Buyurtma #${order.orderNumber}`,
        `Holat: ${statusText[status]}`,
      ].join('\n'),
    );

    return order;
  }
}
