import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CloudinaryModule, PubSubModule, SharedModule } from '@app/shared';
import { AuthController } from './contollers/auth.controller';
import { MathController } from './contollers/math.controller';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { join } from 'path';
import * as cookieParser from 'cookie-parser';
import { AuthResolver } from './resolvers/auth.resolver';
import { UserResolver } from './resolvers/user.resolver';
import { PostResolver } from './resolvers/post.resolver';
import { parseCookies } from './utils';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CloudinaryModule,
    PubSubModule,
    SharedModule.registerRmq('AUTH_SERVICE', 'AUTH'),
    SharedModule.registerRmq('USER_SERVICE', 'USER'),
    SharedModule.registerRmq('POST_SERVICE', 'POST'),
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
              // console.log(webSocket);
              // const cookies = cookie.parse(webSocket.upgradeReq.headers.cookie || '');
              // const cookies = cookieParser.JSONCookies(
              //   webSocket.upgradeReq.headers.cookie || '',
              // );
              const cookieString = webSocket.upgradeReq.headers.cookie || '';
              const cookies = parseCookies(cookieString);

              if (Object.keys(cookies).length > 0) {
                return {
                  req: {
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
  providers: [ApiService, AuthResolver, UserResolver, PostResolver],
})
export class ApiModule {}
