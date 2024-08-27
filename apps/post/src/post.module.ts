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
  Post,
  PostSchema,
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
    MongoDBModule.forRoot('USER', 'user'), // connectionName: 'authConnection'
    MongoDBModule.forRoot('POST', 'post'), //connectionName: 'userConnection'
    MongooseModule.forFeature(
      [
        { name: Post.name, schema: PostSchema },
        { name: User.name, schema: UserSchema },
        { name: Like.name, schema: LikeSchema },
        { name: Comment.name, schema: CommentSchema },
      ],
      'post', // Associate with userConnection
    ),
    MongooseModule.forFeature(
      [{ name: User.name, schema: UserSchema }],
      'user', // authConnection bağlantısı ile ilişkilendir
    ),
  ],
  controllers: [PostController],
  providers: [
    PostService,
    {
      provide: 'SharedServiceInterface',
      useClass: SharedService,
    },
  ],
})
export class PostModule {}
