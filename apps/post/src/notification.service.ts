import {
  Notification,
  NotificationDocument,
  NotificationType,
  PUB_SUB,
} from '@app/shared';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Model } from 'mongoose';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name, 'post')
    private notificationModel: Model<NotificationDocument>,

    @Inject(PUB_SUB)
    private readonly pubSub: RedisPubSub,
  ) {}

  async createNotification(
    recipientId: string,
    senderId: string,
    type: NotificationType,
    contentId: string,
    contentType: string,
    message: string,
  ) {
    try {
      const newNotification = new this.notificationModel({
        recipient: recipientId,
        sender: senderId,
        type,
        contentId,
        contentType,
        message,
        isRead: false,
      });
      const savedNotification = await newNotification.save();

      this.pubSub.publish('newNotification', {
        newNotification: savedNotification,
      });

      return savedNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error; // Hatayı yukarı fırlat
    }
  }

  async getNotificationsForUser(userId: string): Promise<Notification[]> {
    return this.notificationModel
      .find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    return this.notificationModel
      .findByIdAndUpdate(notificationId, { isRead: true }, { new: true })
      .exec();
  }
}
