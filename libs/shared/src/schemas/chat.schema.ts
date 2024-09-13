import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Message } from './message.schema';

export type ChatDocument = Chat & Document;

@Schema({ timestamps: true })
@ObjectType()
export class Chat {
  @Field(() => ID)
  _id: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  @Field(() => [User])
  participants: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Message' }] })
  @Field(() => [Message])
  messages: Types.ObjectId[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
