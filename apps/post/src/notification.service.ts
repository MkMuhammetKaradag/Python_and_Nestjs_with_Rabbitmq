import {
  Content,
  Notification,
  NotificationDocument,
  NotificationType,
  PUB_SUB,
  User,
  UserDocument,
} from '@app/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Model } from 'mongoose';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name, 'post')
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name, 'post')
    private userModel: Model<UserDocument>,
    @Inject(PUB_SUB)
    private readonly pubSub: RedisPubSub,
  ) {}

  async createNotification(
    recipientId: string,
    senderId: string,
    type: NotificationType,
    content: typeof Content,
    contentType: string,
    message: string,
  ) {
    try {
      const sender = await this.userModel
        .findById(senderId)
        .select('userName _id profilePhoto');
      if (!sender) {
        throw Error('user not Found');
      }
      const newNotification = new this.notificationModel({
        recipient: recipientId,
        sender: senderId,
        type,
        content: content._id,
        contentType,
        message,
        isRead: false,
      });
      const savedNotification = await newNotification.save();

      this.pubSub.publish('newNotification', {
        newNotification: {
          recipient: recipientId,
          type,
          content: {
            ...content,
            // __typename: contentType,
          },
          sender,
          _id: savedNotification._id,
          message,
          isRead: false,
          contentType,
        },
      });

      return savedNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error; // Hatayı yukarı fırlat
    }
  }

  async getNotificationsForUser(userId: string): Promise<Notification[]> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const data = await this.notificationModel
      .find({
        recipient: userId,
        $or: [
          { isRead: false }, // Okunmamış bildirimler
          { createdAt: { $gte: twentyFourHoursAgo } }, // 24 saat içinde oluşturulmuş bildirimler
        ],
      })
      .sort({ createdAt: -1 })
      .populate('sender')
      .populate('content')
      .exec();

    return data;
  }

  async markAsRead(notificationId: string) {
    try {
      await this.notificationModel.findByIdAndUpdate(notificationId, {
        isRead: true,
      });

      return 'Success';
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new RpcException({
        message: 'Error marking notification as read',
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }
}
