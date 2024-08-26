import { NestFactory } from '@nestjs/core';
import { PostModule } from './post.module';
import { ConfigService } from '@nestjs/config';
import { SharedService } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(PostModule);
  const configService = app.get(ConfigService);
  const sharedService = app.get(SharedService);
  const port = configService.get('POST_PORT');
  const queue = configService.get<string>('RABBITMQ_POST_QUEUE');
  app.connectMicroservice(sharedService.getRmqOptions('POST'));

  app.startAllMicroservices();
  await app.listen(port);
}
bootstrap();
