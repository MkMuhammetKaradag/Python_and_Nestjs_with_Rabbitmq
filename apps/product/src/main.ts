import { NestFactory } from '@nestjs/core';
import { ProductModule } from './product.module';
import { ConfigService } from '@nestjs/config';
import { SharedService } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(ProductModule);
  const configService = app.get(ConfigService);
  const sharedService = app.get(SharedService);
  const port = configService.get('PRODUCT_PORT');

  app.connectMicroservice(sharedService.getRmqOptions('PRODUCT'));

  app.startAllMicroservices();
  await app.listen(port);
}
bootstrap();
