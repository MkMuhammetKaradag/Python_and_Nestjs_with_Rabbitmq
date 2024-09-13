import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ConfigModule } from '@nestjs/config';
import {
  Chat,
  ChatSchema,
  FollowRequest,
  FollowRequestSchema,
  Message,
  MessageSchema,
  MongoDBModule,
  PubSubModule,
  SharedModule,
  SharedService,
  User,
  UserSchema,
} from '@app/shared';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SharedModule,
    PubSubModule,
    SharedModule.registerRmq('POST_SERVICE', 'POST'),
    MongoDBModule.forRoot('USER', 'user'), //connectionName: 'userConnection'
    MongooseModule.forFeature(
      [
        { name: User.name, schema: UserSchema },
        { name: FollowRequest.name, schema: FollowRequestSchema },
        { name: Chat.name, schema: ChatSchema },
        { name: Message.name, schema: MessageSchema },
      ],
      'user', // Associate with userConnection
    ),
  ],
  controllers: [UserController, ChatController],
  providers: [
    UserService,
    ChatService,
    {
      provide: 'SharedServiceInterface',
      useClass: SharedService,
    },
  ],
})
export class UserModule {}
