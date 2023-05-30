import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [UserModule, SharedModule],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
