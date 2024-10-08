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

  @MessagePattern({
    cmd: 'get_chat_messages',
  })
  async getChatMessages(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      chatId: string;
      page: number;
      pageSize: number;
      extraPassValue: number;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return await this.chatService.getChatMessages(
      payload.chatId,
      payload.page,
      payload.pageSize,
      payload.extraPassValue,
    );
  }

  @MessagePattern({ cmd: 'join-videoRoom' })
  async joinVideoRoom(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      chatId: string;
      userId: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.chatService.joinVideoRoom(payload);
  }

  @MessagePattern({ cmd: 'start_video_call' })
  async startVideoCall(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      currentUserId: string;
      chatId: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.chatService.startVideoCall(
      payload.currentUserId,
      payload.chatId,
    );
  }
}
