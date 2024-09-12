import { Controller, Inject } from '@nestjs/common';

import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { RegisterUserInput, SharedService } from '@app/shared';
import { UserService } from './user.service';

@Controller()
export class PostUserController {
  constructor(
    private readonly userService: UserService,
    @Inject('SharedServiceInterface')
    private readonly sharedService: SharedService,
  ) {}

  @EventPattern({
    cmd: 'created_user',
  })
  async handleUserCreatedEvent(
    @Ctx() context: RmqContext,
    @Payload()
    createUser: {
      userId: string;
      user: RegisterUserInput;
    },
  ) {
    // Actions to be taken when the User created event occurs
    const {
      userId,
      user: { firstName, lastName, email, roles, password },
    } = createUser;

    // Transactions related to this user within the mail service
    try {
      await this.userService.createUser({
        id: userId,
        firstName,
        lastName,
        email,
        roles,
        password,
      });
      this.sharedService.acknowledgeMessage(context);
    } catch (error) {
      this.sharedService.nacknowledgeMessage(context);
    }
  }

  @EventPattern('user_followed')
  async handleUserfollowed(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      followerId: string;
      followedId: string;
    },
  ) {
    try {
      this.userService.followUser(payload.followerId, payload.followedId);
      this.sharedService.acknowledgeMessage(context);
    } catch (error) {
      this.sharedService.nacknowledgeMessage(context);
    }
  }

  @EventPattern('user_unFollowed')
  async handleUserunFollowed(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      followerId: string;
      followedId: string;
    },
  ) {
    try {
      this.userService.unFollowUser(payload.followerId, payload.followedId);
      this.sharedService.acknowledgeMessage(context);
    } catch (error) {
      this.sharedService.nacknowledgeMessage(context);
    }
  }

  @EventPattern('user_isPrivate')
  async changeUserProfilePrivate(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      currentUserId: string;
      isPrivate: boolean;
    },
  ) {
    try {
      this.userService.changeUserProfilePrivate(
        payload.currentUserId,
        payload.isPrivate,
      );
      this.sharedService.acknowledgeMessage(context);
    } catch (error) {
      this.sharedService.nacknowledgeMessage(context);
    }
  }

  @MessagePattern({
    cmd: 'get_user_posts',
  })
  async getUserPosts(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      currentUserId: string;
      userId: string;
      page: number;
      pageSize: number;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return await this.userService.getUserPosts(
      payload.currentUserId,
      payload.userId,
      payload.page,
      payload.pageSize,
    );
  }
}
