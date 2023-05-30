import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order';
import { OrderItem } from './order-item';
import { OrderItemService } from './order-item.service';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem]), SharedModule],
  controllers: [OrderController],
  providers: [OrderService, OrderItemService],
})
export class OrderModule {}
