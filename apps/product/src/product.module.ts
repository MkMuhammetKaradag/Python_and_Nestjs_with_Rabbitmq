import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ConfigModule } from '@nestjs/config';
import {
  MongoDBModule,
  Product,
  ProductSchema,
  SharedModule,
  SharedService,
} from '@app/shared';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SharedModule,
    MongoDBModule.forRoot('PRODUCT'),
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
  ],
  controllers: [ProductController],
  providers: [
    ProductService,
    {
      provide: 'SharedServiceInterface',
      useClass: SharedService,
    },
  ],
})
export class ProductModule {}
