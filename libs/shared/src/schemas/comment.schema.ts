import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Post } from './post.schema';
export type CommentDocument = Comment & Document;

@Schema({ timestamps: true })
@ObjectType()
export class Comment {
  @Field(() => ID)
  _id: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @Field(() => User)
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  @Field(() => Post)
  post: Types.ObjectId;

  @Prop({ required: true })
  @Field()
  content: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
