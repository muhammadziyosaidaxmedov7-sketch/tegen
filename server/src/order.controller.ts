import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  @Post()
  create(@Body() body: any) {
    return this.orders.createOrder(body);
  }

  @Get()
  getAll() {
    return this.orders.getOrders();
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.orders.getOrder(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string },
  ) {
    return this.orders.updateStatus(id, body.status);
  }
}
