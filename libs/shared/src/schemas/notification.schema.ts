import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum NotificationType {
  LIKE = 'like',
  COMMENT = 'comment',
  FOLLOW = 'follow',
  //   MENTION = 'mention',
  //   TAG = 'tag',
  DIRECT_MESSAGE = 'direct_message',
}

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipient: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: Types.ObjectId;

  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({ type: Types.ObjectId, refPath: 'contentType' })
  contentId: Types.ObjectId;

  @Prop({ type: String, enum: ['Post', 'Comment', 'User', 'Like'] })
  contentType: string;

  @Prop({ type: String })
  message: string;

  @Prop({ type: Boolean, default: false })
  isRead: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
