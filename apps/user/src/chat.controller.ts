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
}
