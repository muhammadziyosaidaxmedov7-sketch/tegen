import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('categories')
  async categories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  @Get('products')
  async products() {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        category: { isActive: true },
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('categories')
  async createCategory(@Body() body: { name: string; slug?: string }) {
    const name = String(body.name || '').trim();
    const slug =
      String(body.slug || name)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '') ||
      `category-${Date.now()}`;

    return this.prisma.category.create({
      data: { name, slug },
    });
  }

  @Patch('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() body: { name?: string; isActive?: boolean },
  ) {
    return this.prisma.category.update({
      where: { id: Number(id) },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.isActive !== undefined
          ? { isActive: body.isActive }
          : {}),
      },
    });
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return this.prisma.category.update({
      where: { id: Number(id) },
      data: { isActive: false },
    });
  }

  @Post('products')
  async createProduct(
    @Body()
    body: {
      categoryId: number;
      name: string;
      description?: string;
      price: number;
      oldPrice?: number;
      image?: string;
      isActive?: boolean;
    },
  ) {
    return this.prisma.product.create({
      data: {
        categoryId: Number(body.categoryId),
        name: body.name.trim(),
        description: body.description,
        price: Number(body.price),
        oldPrice:
          body.oldPrice !== undefined && body.oldPrice !== null
            ? Number(body.oldPrice)
            : null,
        image: body.image || null,
        isActive: body.isActive ?? true,
      },
      include: { category: true },
    });
  }

  @Patch('products/:id')
  async updateProduct(
    @Param('id') id: string,
    @Body()
    body: {
      categoryId?: number;
      name?: string;
      description?: string;
      price?: number;
      oldPrice?: number | null;
      image?: string | null;
      isActive?: boolean;
    },
  ) {
    return this.prisma.product.update({
      where: { id: Number(id) },
      data: {
        ...(body.categoryId !== undefined
          ? { categoryId: Number(body.categoryId) }
          : {}),
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.price !== undefined ? { price: Number(body.price) } : {}),
        ...(body.oldPrice !== undefined
          ? { oldPrice: body.oldPrice === null ? null : Number(body.oldPrice) }
          : {}),
        ...(body.image !== undefined ? { image: body.image } : {}),
        ...(body.isActive !== undefined
          ? { isActive: body.isActive }
          : {}),
      },
      include: { category: true },
    });
  }

  @Delete('products/:id')
  async deleteProduct(@Param('id') id: string) {
    return this.prisma.product.update({
      where: { id: Number(id) },
      data: { isActive: false },
    });
  }
            }
