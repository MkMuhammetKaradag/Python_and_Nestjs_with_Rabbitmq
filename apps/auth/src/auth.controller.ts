import { Controller, Get, Inject } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { CreateUserInput, SharedService } from '@app/shared';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject('SharedServiceInterface')
    private readonly sharedService: SharedService,
  ) {}

  @MessagePattern({ cmd: 'get_users' })
  async getUser(@Ctx() context: RmqContext) {
    this.sharedService.acknowledgeMessage(context);

    const data = this.authService.getHello();

    return data;
  }

  @EventPattern('get_users_clg')
  async getUserClg(data: { userId: number; timestamp: Date }) {
    console.log('Received auth event:', data);
  }

  @MessagePattern({ cmd: 'create_user' })
  async createUser(
    @Ctx() context: RmqContext,
    @Payload()
    createUser: CreateUserInput,
  ) {
    this.sharedService.acknowledgeMessage(context);

    const data = await this.authService.create(createUser);

    return data;
  }
}
