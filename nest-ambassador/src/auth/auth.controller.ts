import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  NotFoundException,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { RegisterDto } from './dtos/register.dto';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { Response, Request } from 'express';
import { AuthGuard } from './auth.guard';

@UseInterceptors(ClassSerializerInterceptor)
@Controller()
export class AuthController {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}
  @Post('admin/register')
  async register(@Body() body: RegisterDto) {
    const { confirm_password, ...data } = body;

    if (data.password !== confirm_password) {
      throw new BadRequestException('passwords do not match');
    }

    const hashed = await bcrypt.hash(body.password, 12);

    return this.userService.save({
      ...data,
      password: hashed,
      is_ambassador: false,
    });
  }

  @Post('admin/login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.userService.findOne({ email });

    if (!user) {
      throw new NotFoundException('user not found');
    }

    if (!(await bcrypt.compare(password, user.password))) {
      throw new BadRequestException('wrong password');
    }

    const jwt = await this.jwtService.signAsync({ id: user.id });

    response.cookie('jwt', jwt, { httpOnly: true });

    return {
      message: 'success',
    };
  }

  @UseGuards(AuthGuard)
  @Get('admin/user')
  async user(@Req() request: Request) {
    const cookie = request.cookies['jwt'];

    const { id } = await this.jwtService.verifyAsync(cookie);

    const user = await this.userService.findOne({ id });

    return user;
  }

  @UseGuards(AuthGuard)
  @Post('admin/logout')
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('jwt');

    return { message: 'success' };
  }

  @UseGuards(AuthGuard)
  @Put('admin/users/info')
  async upadateInfo(
    @Req() request: Request,
    @Body('email') email: string,
    @Body('last_name') last_name: string,
    @Body('first_name') first_name,
  ) {
    const cookie = request.cookies['jwt'];

    const { id } = await this.jwtService.verifyAsync(cookie);

    await this.userService.update(id, { first_name, last_name, email });

    return this.userService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Put('admin/users/password')
  async upadatePassword(
    @Req() request: Request,
    @Body('password') password: string,
    @Body('password_confirm') password_confirm: string,
  ) {
    if (password !== password_confirm) {
      throw new BadRequestException('passwords not matching');
    }
    const cookie = request.cookies['jwt'];

    const { id } = await this.jwtService.verifyAsync(cookie);

    await this.userService.update(id, {
      password: await bcrypt.hash(password, 12),
    });

    return this.userService.findOne(id);
  }
}
