import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule } from '@nestjs/config';
import {
  MongoDBModule,
  Product,
  ProductSchema,
  SharedModule,
  SharedService,
  User,
  UserSchema,
} from '@app/shared';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SharedModule,
    MongoDBModule.forRoot('AUTH', 'auth'), // connectionName: 'authConnection'
    MongoDBModule.forRoot('PRODUCT', 'product'), // connectionName: 'productConnection'
    // MongooseModule.forRoot('mongodb://localhost:27017/user', {
    //   connectionName: 'auth',
    // }),
    // MongooseModule.forRoot('mongodb://localhost:27017/product', {
    //   connectionName: 'product',
    // }),
    MongooseModule.forFeature(
      [{ name: User.name, schema: UserSchema }],
      'auth', // authConnection bağlantısı ile ilişkilendir
    ),
    MongooseModule.forFeature(
      [{ name: Product.name, schema: ProductSchema }],
      'product', // productConnection bağlantısı ile ilişkilendir
    ),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: 'SharedServiceInterface',
      useClass: SharedService,
    },
  ],
})
export class AuthModule {}
