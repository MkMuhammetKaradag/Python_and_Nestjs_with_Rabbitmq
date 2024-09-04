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

  @MessagePattern({
    cmd: 'unFollow_user',
  })
  async unFollowUser(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      targetUserId: string;
      currentUserId: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.userService.unFollowUser(
      payload.currentUserId,
      payload.targetUserId,
    );
  }

  @MessagePattern({
    cmd: 'accept_follow_request',
  })
  async acceptFollowRequest(
    @Ctx() context: RmqContext,
    @Payload()
    acceptFollowRequest: {
      requestId: string;
      currentUserId: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.userService.acceptFollowRequest(
      acceptFollowRequest.currentUserId,
      acceptFollowRequest.requestId,
    );
  }
  @MessagePattern({
    cmd: 'reject_follow_request',
  })
  async rejectFollowRequest(
    @Ctx() context: RmqContext,
    @Payload()
    rejectFollowRequest: {
      requestId: string;
      currentUserId: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.userService.rejectFollowRequest(
      rejectFollowRequest.currentUserId,
      rejectFollowRequest.requestId,
    );
  }
  @MessagePattern({
    cmd: 'get_follow_request',
  })
  async getFollowRequests(
    @Ctx() context: RmqContext,
    @Payload()
    getFollowRequests: {
      currentUserId: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.userService.getFollowRequests(getFollowRequests.currentUserId);
  }
}
