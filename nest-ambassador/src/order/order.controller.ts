import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  NotFoundException,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateOrderDto } from './dtos/create-order.dto';
import { LinkService } from '../link/link.service';
import { Order } from './order';
import { Link } from '../link/link';
import { ProductService } from '../product/product.service';
import { OrderItem } from './order-item';
import { Product } from '../product/product';

import { Connection } from 'typeorm';
import { InjectStripe } from 'nestjs-stripe';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class OrderController {
  constructor(
    private orderService: OrderService,
    private linkService: LinkService,
    private productService: ProductService,
    private connection: Connection,
    @InjectStripe() private readonly stripeClient: Stripe,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  @UseGuards(AuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @Get('admin/orders')
  all() {
    return this.orderService.find({ relations: { order_items: true } });
  }

  @Post('checkout/orders')
  async create(@Body() body: CreateOrderDto) {
    const link: Link = await this.linkService.findOne({
      where: { code: body.code },
      relations: { user: true },
    });

    if (!link) {
      throw new BadRequestException('invalid link');
    }

    const queryRunner = this.connection.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const o = new Order();
      o.user_id = link.user.id;
      o.ambassador_email = link.user.email;
      o.first_name = body.first_name;
      o.last_name = body.last_name;
      o.email = body.email;
      o.address = body.address;
      o.country = body.country;
      o.city = body.city;
      o.zip = body.zip;
      o.code = body.code;

      const order = await queryRunner.manager.save(o);

      const line_items = [];

      for (const p of body.products) {
        const product: Product = await this.productService.findOne({
          where: { id: p.product_id },
        });

        const orderItem = new OrderItem();
        orderItem.order = order;
        orderItem.product_title = product.title;
        orderItem.price = product.price;
        orderItem.quantity = p.quatity;
        (orderItem.ambassador_revenue = 0), 1 * product.price * p.quatity;
        (orderItem.admin_revenue = 0), 9 * product.price * p.quatity;

        await queryRunner.manager.save(orderItem);

        line_items.push({
          name: product.title,
          description: product.description,
          images: [product.image],
          amount: 100 * product.price,
          currency: 'usd',
          quantity: p.quatity,
        });
      }

      const source = await this.stripeClient.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: line_items,
        success_url: `${this.configService.get(
          'CHECKOUT_URL',
        )}/success?source={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.configService.get('CHECKOUT_URL')}/error`,
      });

      order.transaction_id = source['id'];

      await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();

      return source;
    } catch (e) {
      console.log(e);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  @Post('checkout/order/confirm')
  async confirm(@Body('source') source: string) {
    const order = await this.orderService.findOne({
      where: { transaction_id: source },
      relations: {
        order_items: true,
        user: true,
      },
    });

    if (!order) {
      throw new NotFoundException('order not found');
    }

    await this.orderService.update(order.id, { complete: true });

    await this.eventEmitter.emit('order_completed', order);

    return {
      message: 'success',
    };
  }
}
