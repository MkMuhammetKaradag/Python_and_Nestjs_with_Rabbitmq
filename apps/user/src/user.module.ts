import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ConfigModule } from '@nestjs/config';
import {
  FollowRequest,
  FollowRequestSchema,
  MongoDBModule,
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
    SharedModule.registerRmq('POST_SERVICE', 'POST'),
    MongoDBModule.forRoot('USER', 'user'), //connectionName: 'userConnection'
    MongooseModule.forFeature(
      [
        { name: User.name, schema: UserSchema },
        { name: FollowRequest.name, schema: FollowRequestSchema },
      ],
      'user', // Associate with userConnection
    ),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: 'SharedServiceInterface',
      useClass: SharedService,
    },
  ],
})
export class UserModule {}
