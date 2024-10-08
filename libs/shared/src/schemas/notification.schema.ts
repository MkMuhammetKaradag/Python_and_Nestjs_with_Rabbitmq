import {
  createUnionType,
  Field,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Post } from './post.schema';
import { Like } from './like.schema';
import { Comment } from './comment.schema';
import { GraphQLResolveInfo } from 'graphql';
export enum NotificationType {
  LIKE = 'like',
  COMMENT = 'comment',
  FOLLOW = 'follow',
  //   MENTION = 'mention',
  //   TAG = 'tag',
  DIRECT_MESSAGE = 'direct_message',
}
interface NotificationRootValue {
  contentType: string;
}
export const Content = createUnionType({
  name: 'Content',
  types: () => [Post, Like, Comment, User],
  resolveType(value: any, context: any) {
    // contentType bilgisini kontrol et
    const contentType = value.__typename;

    if (contentType) {
      switch (contentType) {
        case 'Post':
          return Post;
        case 'Like':
          return Like;
        case 'Comment':
          return Comment;
        case 'User':
          return User;
      }
    }

    // Eğer contentType yoksa value üzerinden kontrol et
    if (value) {
      if ('userName' in value) return User;
      if ('title' in value) return Post;
      if ('post' in value && 'user' in value) return Like;
      if ('content' in value) return Comment;
    }

    return null;
  },
});
registerEnumType(NotificationType, {
  name: 'NotificationType',
  description: 'Type of notification content',
});

@Schema({ timestamps: true })
@ObjectType()
export class Notification extends Document {
  @Field(() => ID)
  _id: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @Field(() => User)
  recipient: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @Field(() => User)
  sender: Types.ObjectId;

  @Prop({ type: String, enum: NotificationType, required: true })
  @Field(() => NotificationType)
  type: NotificationType;

  @Prop({ type: Types.ObjectId, refPath: 'contentType' })
  @Field(() => Content, { nullable: true })
  content: typeof Content;

  @Prop({ type: String, enum: ['Post', 'Comment', 'User', 'Like'] })
  @Field()
  contentType: string;

  @Prop({ type: String })
  @Field()
  message: string;

  @Prop({ type: Boolean, default: false })
  @Field()
  isRead: boolean;

  @Prop({ type: Date, default: Date.now, expires: 172800 })
  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
export type NotificationDocument = Notification & Document;
