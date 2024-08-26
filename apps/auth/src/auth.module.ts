import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  EmailModule,
  MongoDBModule,
  Product,
  ProductSchema,
  SharedModule,
  SharedService,
  User,
  UserSchema,
} from '@app/shared';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' }, // Access token için 15 dakika
      }),
      inject: [ConfigService],
    }),
    SharedModule,
    EmailModule,
    MongoDBModule.forRoot('AUTH', 'auth'), // connectionName: 'authConnection'
    MongoDBModule.forRoot('PRODUCT', 'product'), // connectionName: 'productConnection'
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
