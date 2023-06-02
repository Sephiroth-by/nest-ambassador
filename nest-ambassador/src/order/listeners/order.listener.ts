import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Order } from '../order';
import { RedisService } from '../../shared/redis.service';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class OrderListener {
  constructor(
    private redisService: RedisService,
    private mailerService: MailerService,
  ) {}

  @OnEvent('order_completed')
  async handleOrderCompletedEvent(order: Order) {
    const client = this.redisService.getClient();
    client.zincrby('rankings', order.ambassador_revenue, order.user.name);

    try {
      await this.mailerService.sendMail({
        to: 'admin@admin.com',
        subject: 'order completed',
        html: `Order #${order.id} with total $${order.total} was completed!`,
      });

      await this.mailerService.sendMail({
        to: order.ambassador_email,
        subject: 'order completed',
        html: `Order #${order.id} with revenue $${order.ambassador_revenue} was completed! Link: ${order.code}`,
      });
    } catch (e) {
      console.log(e);
    }
  }
}
