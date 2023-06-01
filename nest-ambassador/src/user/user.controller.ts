import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '../auth/auth.guard';
import { User } from './user';
import { RedisService } from '../shared/redis.service';
import { Response } from 'express';

@UseGuards(AuthGuard)
@Controller()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private redisService: RedisService,
  ) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Get('admin/ambassadors')
  async ambassadors() {
    return this.userService.find({ where: { is_ambassador: true } });
  }

  @Get('ambassadors/rankings')
  async rankings(@Res() response: Response) {
    const client = this.redisService.getClient();

    client.zrevrangebyscore(
      'rankings',
      '+inf',
      '-inf',
      'withscores',
      (err, result) => {
        let score;
        response.send(
          result.reduce((o, r) => {
            if (isNaN(parseInt(r))) {
              return {
                ...o,
                [r]: score,
              };
            } else {
              score = parseInt(r);
              return o;
            }
          }, {}),
        );
      },
    );

    // const ambassadors: User[] = await this.userService.find({
    //   where: { is_ambassador: true },
    //   relations: {
    //     orders: {
    //       order_items: true,
    //     },
    //   },
    // });
    // return ambassadors.map((a) => {
    //   return {
    //     name: a.name,
    //     revenue: a.revenue,
    //   };
    // });
  }
}
