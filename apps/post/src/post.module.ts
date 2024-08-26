import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { ConfigModule } from '@nestjs/config';
import {
  MongoDBModule,
  Post,
  PostSchema,
  SharedModule,
  SharedService,
} from '@app/shared';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SharedModule,
    MongoDBModule.forRoot('POST', 'post'), //connectionName: 'userConnection'
    MongooseModule.forFeature(
      [{ name: Post.name, schema: PostSchema }],
      'post', // Associate with userConnection
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
