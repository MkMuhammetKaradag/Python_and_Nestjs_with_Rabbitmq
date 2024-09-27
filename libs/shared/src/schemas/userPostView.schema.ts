import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class UserPostView {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  post: Types.ObjectId;

  @Prop({ default: 1 })
  viewCount: number;
}

export type UserPostViewDocument = UserPostView & Document;
export const UserPostViewSchema = SchemaFactory.createForClass(UserPostView);
