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
    cmd: 'get_user_profile',
  })
  async getUserProfile(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      currentUserId: string;
      userId: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.userService.getUserProfile(
      payload.currentUserId,
      payload.userId,
    );
  }
  @MessagePattern({
    cmd: 'update_user_profile',
  })
  async updateUserProfile(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      currentUserId: string;
      userName: string;
      firstName: string;
      lastName: string;
      isPrivate: boolean;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.userService.updateUserProfile(
      payload.currentUserId,
      payload.userName,
      payload.firstName,
      payload.lastName,
      payload.isPrivate,
    );
  }

  @MessagePattern({
    cmd: 'change_user_interests',
  })
  async changeUserInterests(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      currentUserId: string;
      interests: string[];
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.userService.changeUserInterests(
      payload.currentUserId,
      payload.interests,
    );
  }

  @MessagePattern({
    cmd: 'upload_profile_photo',
  })
  async uploadProfilePhoto(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      currentUserId: string;
      profilePhoto: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.userService.uploadProfilePhoto(
      payload.currentUserId,
      payload.profilePhoto,
    );
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
  @MessagePattern({
    cmd: 'get_following_request',
  })
  async getFollowingRequests(
    @Ctx() context: RmqContext,
    @Payload()
    getFollowRequests: {
      currentUserId: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.userService.getFollowingRequests(
      getFollowRequests.currentUserId,
    );
  }

  @MessagePattern({
    cmd: 'delete_following_request',
  })
  async deleteFollowingRequests(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      currentUserId: string;
      requestId: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.userService.deleteFollowingRequest(
      payload.currentUserId,
      payload.requestId,
    );
  }
  @MessagePattern({
    cmd: 'set_user_profile_private',
  })
  async setUserProfilePrivate(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      currentUserId: string;
      isPrivate: boolean;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.userService.setUserProfilePrivate(
      payload.currentUserId,
      payload.isPrivate,
    );
  }

  @MessagePattern({
    cmd: 'get_user_following',
  })
  async getUserFollowing(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      currentUserId: string;
      userId: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.userService.getUserFollowing(
      payload.currentUserId,
      payload.userId,
    );
  }

  @MessagePattern({
    cmd: 'get_user_followers',
  })
  async getUserFollowers(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      currentUserId: string;
      userId: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.userService.getUserFollowers(
      payload.currentUserId,
      payload.userId,
    );
  }

  @MessagePattern({
    cmd: 'search_for_user',
  })
  async getSearchForUser(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      searchText: string;
      page: number;
      pageSize: number;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.userService.searchForUser(
      payload.searchText,
      payload.page,
      payload.pageSize,
    );
  }

  @MessagePattern({
    cmd: 'get_friend_suggestions',
  })
  async getFriendSuggestions(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      userId: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.userService.getFriendSuggestions(payload.userId);
  }

  @MessagePattern({
    cmd: 'update_user_status',
  })
  async updateUserStatus(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      userId: string;
      status: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.userService.updateUserStatus(payload.userId, payload.status);
  }

  @MessagePattern({
    cmd: 'get_user_status',
  })
  async getUserStatus(
    @Ctx() context: RmqContext,
    @Payload()
    payload: {
      userId: string;
    },
  ) {
    this.sharedService.acknowledgeMessage(context);
    return this.userService.getUserStatus(payload.userId);
  }
}
