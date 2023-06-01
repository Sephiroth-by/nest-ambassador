import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  UseGuards,
  CacheKey,
  CacheTTL,
  UseInterceptors,
  CacheInterceptor,
  CACHE_MANAGER,
  Inject,
  Req,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductCreateDto } from './dtos/product-create.dto';
import { AuthGuard } from '../auth/auth.guard';
import { Cache } from 'cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { Product } from './product';

@Controller()
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private eventEmitter: EventEmitter2,
  ) {}

  @UseGuards(AuthGuard)
  @Get('admin/products')
  async all() {
    return this.productService.find();
  }

  @UseGuards(AuthGuard)
  @Post('admin/products')
  async create(@Body() body: ProductCreateDto) {
    const product = await this.productService.save(body);

    this.eventEmitter.emit('product_updated');

    return product;
  }

  @UseGuards(AuthGuard)
  @Get('admin/products/:id')
  async get(@Param('id') id: number) {
    return this.productService.findOne({ where: { id } });
  }

  @UseGuards(AuthGuard)
  @Put('admin/products/:id')
  async update(@Param('id') id: number, @Body() body: ProductCreateDto) {
    await this.productService.update(id, body);

    this.eventEmitter.emit('product_updated');

    const product = await this.productService.findOne({ where: { id } });

    return product;
  }

  @UseGuards(AuthGuard)
  @Delete('admin/products/:id')
  async delete(@Param('id') id: number) {
    const response = await this.productService.delete(id);

    this.eventEmitter.emit('product_updated');

    return response;
  }

  @CacheKey('products_frontend')
  @CacheTTL(30 * 60)
  @UseInterceptors(CacheInterceptor)
  @Get('ambassador/products/frontend')
  async frontend() {
    const products = await this.productService.find();
    return products;
  }

  @Get('ambassador/products/backend')
  async backend(@Req() request: Request) {
    let products = await this.cacheManager.get<Product[]>('products_backend');
    if (!products) {
      products = await this.productService.find();
      await this.cacheManager.set('products_backend', products, 1800);
    }

    if (request.query.s) {
      const s = request.query.s.toString().toLowerCase();
      products = products.filter(
        (p) =>
          p.title.toLowerCase().indexOf(s) !== -1 ||
          p.description.toLowerCase().indexOf(s) !== -1,
      );
    }

    if (request.query.sort === 'asc' || request.query.sort === 'desc') {
      products.sort((a: Product, b: Product) => {
        const diff = a.price - b.price;
        if (diff === 0) return 0;

        const sign = Math.abs(diff) / diff;

        return request.query.sort === 'asc' ? sign : -sign;
      });
    }

    const page: number = parseInt(request.query.page as any) || 1;
    const perPage = 9;
    const total = products.length;

    const data = products.slice((page - 1) * perPage, page * perPage);

    return {
      data,
      total,
      page,
      last_page: Math.ceil(total / perPage),
    };
  }
}
