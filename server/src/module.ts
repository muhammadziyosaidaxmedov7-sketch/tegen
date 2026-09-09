import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CatalogController } from './catalog.controller';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { AdminController } from './admin.controller';
import { UserController } from './user.controller';
import { MessageController } from './message.controller';
import { ProposalController } from './proposal.controller';

@Module({
  controllers: [
    CatalogController,
    OrderController,
    AdminController,
    UserController,
    MessageController,
    ProposalController,
  ],
  providers: [
    PrismaService,
    OrderService,
  ],
})
export class AppModule {}
