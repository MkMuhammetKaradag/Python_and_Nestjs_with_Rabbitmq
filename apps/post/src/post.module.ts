import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { ConfigModule } from '@nestjs/config';
import {
  Comment,
  CommentSchema,
  Like,
  LikeSchema,
  MongoDBModule,
  Notification,
  NotificationSchema,
  Post,
  PostSchema,
  PubSubModule,
  SharedModule,
  SharedService,
  User,
  UserPostView,
  UserPostViewSchema,
  UserSchema,
} from '@app/shared';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from './user.service';
import { PostUserController } from './postUser.controller';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SharedModule,
    PubSubModule,
    SharedModule.registerRmq('POST_SERVICE', 'POST'),
    MongoDBModule.forRoot('USER', 'user'), // connectionName: 'authConnection'
    MongoDBModule.forRoot('POST', 'post'), //connectionName: 'userConnection'
    MongooseModule.forFeature(
      [
        { name: Post.name, schema: PostSchema },
        { name: User.name, schema: UserSchema },
        { name: Like.name, schema: LikeSchema },
        { name: Comment.name, schema: CommentSchema },
        { name: UserPostView.name, schema: UserPostViewSchema },
        { name: Notification.name, schema: NotificationSchema },
      ],
      'post', // Associate with userConnection
    ),
    MongooseModule.forFeature(
      [{ name: User.name, schema: UserSchema }],
      'user', // authConnection bağlantısı ile ilişkilendir
    ),
  ],
  controllers: [PostController, PostUserController, NotificationController],
  providers: [
    PostService,
    UserService,
    NotificationService,
    {
      provide: 'SharedServiceInterface',
      useClass: SharedService,
    },
  ],
})
export class PostModule {}
