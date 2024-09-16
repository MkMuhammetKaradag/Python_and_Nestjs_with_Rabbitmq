import { Controller, Get, Inject } from '@nestjs/common';
import { SharedService } from '@app/shared';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { ChatService } from './chat.service';

@Controller()
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    @Inject('SharedServiceInterface')
    private readonly sharedService: SharedService,
  ) {}

  @MessagePattern({
    cmd: 'create_chat',
  })
  async createChat(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      participantIds: string[];
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return await this.chatService.createChat(payload.participantIds);
  }

  @MessagePattern({
    cmd: 'add_message_to_chat',
  })
  async addMessageToChat(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      chatId: string;
      senderId: string;
      content: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return await this.chatService.addMessageToChat(
      payload.chatId,
      payload.senderId,
      payload.content,
    );
  }

  @MessagePattern({
    cmd: 'get_chats',
  })
  async getChats(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      currentUserId: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return await this.chatService.getChats(payload.currentUserId);
  }
}
