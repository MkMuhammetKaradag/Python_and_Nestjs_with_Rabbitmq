import { NestFactory } from '@nestjs/core';
import { UserModule } from './user.module';
import { ConfigService } from '@nestjs/config';
import { SharedService } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(UserModule);
  const configService = app.get(ConfigService);
  const sharedService = app.get(SharedService);
  const port = configService.get('USER_PORT');
  const queue = configService.get<string>('RABBITMQ_USER_QUEUE');
  app.connectMicroservice(sharedService.getRmqOptions('USER'));
  app.connectMicroservice(sharedService.getRmqOptions('CHAT'));

  app.startAllMicroservices();
  await app.listen(port);
}
bootstrap();
