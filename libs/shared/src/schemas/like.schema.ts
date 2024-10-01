import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Post } from './post.schema';

export type LikeDocument = Like & Document;

@Schema({ timestamps: true })
@ObjectType()
export class Like {
  @Field(() => ID)
  _id: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @Field(() => User)
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  @Field(() => Post)
  post: Types.ObjectId;

  @Field(() => String)
  createdAt: Date;
}

export const LikeSchema = SchemaFactory.createForClass(Like);
LikeSchema.index({ user: 1, post: 1 }, { unique: true });
