import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { randomInt } from 'crypto';
import { OrderService } from '../order/order.service';
import { OrderItemService } from '../order/order-item.service';

(async () => {
  const app = await NestFactory.createApplicationContext(AppModule);

  const orderService = app.get(OrderService);
  const orderItemService = app.get(OrderItemService);

  for (let i = 0; i < 30; i++) {
    const order = await orderService.save({
      user_id: randomInt(2, 31),
      code: `${i}`,
      ambassador_email: `zxc@${i}.com`,
      first_name: `first ${i}`,
      last_name: `last ${i}`,
      email: `asd@${i}.com`,
      complete: true,
    });

    for (let j = 0; j < randomInt(1, 5); j++) {
      await orderItemService.save({
        order,
        product_title: `title ${j}`,
        price: randomInt(10, 100),
        quantity: randomInt(1, 5),
        admin_revenue: randomInt(10, 100),
        ambassador_revenue: randomInt(1, 10),
      });
    }
  }

  process.exit();
})();
