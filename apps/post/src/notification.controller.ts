import { Controller, Inject } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationType, SharedService } from '@app/shared';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';

@Controller()
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    @Inject('SharedServiceInterface')
    private readonly sharedService: SharedService,
  ) {}

  @EventPattern('create_notification')
  async handleNotificationCreatedEvent(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      recipientId: string;
      senderId: string;
      type: NotificationType;
      contentId: string;
      contentType: string;
      message: string;
    },
  ) {
    try {
      await this.notificationService.createNotification(
        payload.recipientId,
        payload.senderId,
        payload.type,
        payload.contentId,
        payload.contentType,
        payload.message,
      );
      this.sharedService.acknowledgeMessage(context);
    } catch (error) {
      console.error('Error processing notification:', error);
      // Hata durumunda bile mesajı acknowledge et
      this.sharedService.acknowledgeMessage(context);
      // Opsiyonel: Hata logu oluştur veya bir hata raporlama servisi kullan
    }
  }

  @MessagePattern({
    cmd: 'get_notifications',
  })
  async getNotifications(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      currentUserId: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return await this.notificationService.getNotificationsForUser(
      payload.currentUserId,
    );
  }
}
