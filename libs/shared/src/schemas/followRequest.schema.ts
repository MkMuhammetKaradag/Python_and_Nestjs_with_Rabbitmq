import { Field, ID, registerEnumType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';

export type FollowRequestDocument = FollowRequest & Document;
export enum FollowRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

registerEnumType(FollowRequestStatus, {
  name: 'FollowRequestStatus',
  description: 'Status of the Request',
});
@Schema({ timestamps: true })
export class FollowRequest {
  @Field(() => ID)
  _id: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @Field(() => User)
  from: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @Field(() => User)
  to: Types.ObjectId;

  @Prop({
    type: String,
    enum: FollowRequestStatus,
    default: FollowRequestStatus.PENDING,
  })
  @Field(() => FollowRequestStatus)
  status: string;
}

export const FollowRequestSchema = SchemaFactory.createForClass(FollowRequest);
