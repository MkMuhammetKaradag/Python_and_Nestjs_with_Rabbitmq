import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SharedModule } from '@app/shared';
import { AuthController } from './contollers/auth.controller';
import { MathController } from './contollers/math.controller';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { join } from 'path';
import * as cookieParser from 'cookie-parser';
import { AuthResolver } from './resolvers/auth.resolver';
import { UserResolver } from './resolvers/user.resolver';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SharedModule.registerRmq('AUTH_SERVICE', 'AUTH'),
    SharedModule.registerRmq('MATH_SERVICE', 'MATH'),
    SharedModule.registerRmq('PRODUCT_SERVICE', 'PRODUCT'),
    GraphQLModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      driver: ApolloDriver,
      useFactory: async (configService: ConfigService) => ({
        playground: Boolean(configService.get('GRAPHQL_PLAYGROUND')),
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        uploads: false,

        context: ({ req, res, connection }) => {
          if (connection) {
            return { req: connection.context, res };
          }
          return { req, res };
        },
        subscriptions: {
          'subscriptions-transport-ws': {
            onConnect: (connectionParams, webSocket, context) => {
              const cookies = connectionParams.cookies
                ? cookieParser.JSONCookies(connectionParams.cookies)
                : {};
              // console.log('sds', cookies);
              if (connectionParams.Authorization) {
                console.log(connectionParams.Authorization);
                return {
                  req: {
                    headers: {
                      authorization: connectionParams.Authorization,
                    },
                    cookies: cookies,
                  },
                };
              }
              throw new Error('Missing auth token!');
            },
          },
        },
      }),
    }),
  ],
  controllers: [ApiController, AuthController, MathController],
  providers: [ApiService, AuthResolver, UserResolver],
})
export class ApiModule {}
