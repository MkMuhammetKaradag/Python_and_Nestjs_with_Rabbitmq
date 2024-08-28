import { Controller, Get, Inject } from '@nestjs/common';
import { UserService } from './user.service';
import { SharedService } from '@app/shared';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';

@Controller()
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject('SharedServiceInterface')
    private readonly sharedService: SharedService,
  ) {}

  @MessagePattern({
    cmd: 'get_user',
  })
  async getUser(@Ctx() context: RmqContext) {
    this.sharedService.acknowledgeMessage(context);
    return 'users';
  }

  @MessagePattern({
    cmd: 'follow_user',
  })
  async followUser(
    @Ctx() context: RmqContext,
    @Payload()
    followUser: {
      targetUserId: string;
      currentUserId: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.userService.followUser(
      followUser.currentUserId,
      followUser.targetUserId,
    );
  }
}
