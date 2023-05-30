import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcryptjs';

(async () => {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userService = app.get(UserService);

  for (let i = 0; i < 30; i++) {
    await userService.save({
      first_name: `first ${i}`,
      last_name: `last ${i}`,
      email: `asd@${i}.com`,
      password: await bcrypt.hash('1234', 12),
      is_ambassador: true,
    });
  }

  process.exit();
})();
