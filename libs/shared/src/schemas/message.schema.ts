import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Chat } from './chat.schema';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
@ObjectType()
export class Message {
  @Field(() => ID)
  _id: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @Field(() => User)
  sender: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Chat', required: true })
  @Field(() => Chat)
  chat: Types.ObjectId;

  @Prop({ required: true })
  @Field()
  content: string;

  @Prop({ default: false })
  @Field(() => Boolean)
  isRead: boolean;

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
