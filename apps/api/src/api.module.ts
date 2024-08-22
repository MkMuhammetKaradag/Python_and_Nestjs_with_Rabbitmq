import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from '@app/shared';
import { AuthController } from './contollers/auth.controller';
import { MathController } from './contollers/math.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SharedModule.registerRmq('AUTH_SERVICE', 'AUTH'),
    SharedModule.registerRmq('MATH_SERVICE', 'MATH'),
  ],
  controllers: [ApiController, AuthController, MathController],
  providers: [ApiService],
})
export class ApiModule {}
