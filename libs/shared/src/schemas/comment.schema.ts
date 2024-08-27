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

  @Prop({ default: false })
  @Field()
  isDeleted: boolean;

  @Prop({ nullable: true })
  @Field(() => String, { nullable: true }) // Boş olabilir
  deletedAt?: Date;

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
