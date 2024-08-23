import { NestFactory } from '@nestjs/core';
import { ApiModule } from './api.module';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  HttpStatus,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { GraphQLError } from 'graphql';

import * as cookieParser from 'cookie-parser';
async function bootstrap() {
  const app = await NestFactory.create(ApiModule);
  const configService = app.get(ConfigService);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = errors.map(
          (error) =>
            `${error.property} has wrong value ${error.value}, ${Object.values(error.constraints).join(', ')}`,
        );

        return new GraphQLError(messages.join('-'), {
          extensions: {
            code: HttpStatus.BAD_REQUEST,
          },
        });

        // return new BadRequestException(messages);
      },
    }),
  );
  const PORT = configService.get<number>('API_PORT');
  await app.listen(PORT);
}
bootstrap();
