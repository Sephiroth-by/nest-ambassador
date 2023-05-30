import { Module } from '@nestjs/common';
import { LinkController } from './link.controller';
import { LinkService } from './link.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Link } from './link';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [TypeOrmModule.forFeature([Link]), SharedModule],
  controllers: [LinkController],
  providers: [LinkService],
})
export class LinkModule {}
