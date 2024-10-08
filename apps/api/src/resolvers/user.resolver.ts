import { Resolver, Query, Args, Mutation, Subscription } from '@nestjs/graphql';
import { BadRequestException, Inject, UseGuards } from '@nestjs/common';
import {
  AuthGuard,
  ChangeUserInterestsInput,
  ChangeUserStatusObject,
  CurrentUser,
  FollowRequest,
  GetSearchForUserInput,
  GetSearchForUserObject,
  GetUserFollowingObject,
  GetUserProfileObject,
  PUB_SUB,
  UpdateUserProfileInput,
  User,
} from '@app/shared';
import { ClientProxy } from '@nestjs/microservices';
import { GraphQLError } from 'graphql';
import { firstValueFrom } from 'rxjs';
import { RedisPubSub } from 'graphql-redis-subscriptions';
const CHANGE_USER_STATUS = 'changeUserStatus';
@Resolver('User')
export class UserResolver {
  constructor(
    @Inject('USER_SERVICE')
    private readonly userService: ClientProxy,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
  ) {}
  @Query(() => String)
  @UseGuards(AuthGuard)
  async protectedQuery(@CurrentUser() user: any) {
    console.log('clear', user); // Bu, kimliği doğrulanmış kullanıcının bilgilerini içerecek
    return `Merhaba , bu veri korunuyor!`;
  }

  @Mutation(() => User)
  @UseGuards(AuthGuard)
  async updateUserProfile(
    @Args('input') input: UpdateUserProfileInput,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }

    try {
      const data = await firstValueFrom<User>(
        this.userService.send(
          {
            cmd: 'update_user_profile',
          },
          {
            currentUserId: user._id,
            ...input,
          },
        ),
      );

      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }
  @Mutation(() => [String])
  @UseGuards(AuthGuard)
  async changeUserInterests(
    @Args('input') input: ChangeUserInterestsInput,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }

    try {
      const data = await firstValueFrom<string[]>(
        this.userService.send(
          {
            cmd: 'change_user_interests',
          },
          {
            currentUserId: user._id,
            interests: input.interests,
          },
        ),
      );

      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async followUser(
    @Args('targetUserId') targetUserId: string,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const data = await firstValueFrom<{
        message: string;
      }>(
        this.userService.send(
          {
            cmd: 'follow_user',
          },
          {
            currentUserId: user._id,
            targetUserId: targetUserId,
          },
        ),
      );

      return data.message;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async unFollowUser(
    @Args('targetUserId') targetUserId: string,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const data = await firstValueFrom<{
        message: string;
      }>(
        this.userService.send(
          {
            cmd: 'unFollow_user',
          },
          {
            currentUserId: user._id,
            targetUserId: targetUserId,
          },
        ),
      );

      return data.message;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async acceptFollowRequest(
    @Args('requestId') requestId: string,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const data = await firstValueFrom<{
        message: string;
      }>(
        this.userService.send(
          {
            cmd: 'accept_follow_request',
          },
          {
            currentUserId: user._id,
            requestId: requestId,
          },
        ),
      );

      return data.message;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async rejectFollowRequest(
    @Args('requestId') requestId: string,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const data = await firstValueFrom<{
        message: string;
      }>(
        this.userService.send(
          {
            cmd: 'reject_follow_request',
          },
          {
            currentUserId: user._id,
            requestId: requestId,
          },
        ),
      );

      return data.message;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }

  @Query(() => [FollowRequest])
  @UseGuards(AuthGuard)
  async getFollowRequests(@CurrentUser() user: any) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const data = await firstValueFrom<FollowRequest[]>(
        this.userService.send(
          {
            cmd: 'get_follow_request',
          },
          {
            currentUserId: user._id,
          },
        ),
      );

      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }
  @Query(() => [FollowRequest])
  @UseGuards(AuthGuard)
  async getFollowingRequests(@CurrentUser() user: any) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const data = await firstValueFrom<FollowRequest[]>(
        this.userService.send(
          {
            cmd: 'get_following_request',
          },
          {
            currentUserId: user._id,
          },
        ),
      );

      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async deleteFollowingRequests(
    @CurrentUser() user: any,
    @Args('requestId') requestId: string,
  ) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const data = await firstValueFrom<string>(
        this.userService.send(
          {
            cmd: 'delete_following_request',
          },
          {
            currentUserId: user._id,
            requestId,
          },
        ),
      );
      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async setUserProfilePrivate(
    @CurrentUser() user: any,
    @Args('isPrivate') isPrivate: boolean,
  ) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const data = await firstValueFrom<string>(
        this.userService.send(
          {
            cmd: 'set_user_profile_private',
          },
          {
            currentUserId: user._id,
            isPrivate,
          },
        ),
      );
      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }
  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async uploadProfilePhoto(
    @CurrentUser() user: any,
    @Args('profilePhoto') profilePhoto: string,
  ) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const data = await firstValueFrom<string>(
        this.userService.send(
          {
            cmd: 'upload_profile_photo',
          },
          {
            currentUserId: user._id,
            profilePhoto,
          },
        ),
      );
      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }

  @Query(() => GetUserProfileObject)
  @UseGuards(AuthGuard)
  async getUserProfile(
    @Args('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const data = await firstValueFrom(
        this.userService.send(
          {
            cmd: 'get_user_profile',
          },
          {
            currentUserId: user._id,
            userId,
          },
        ),
      );
      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }

  @Query(() => [GetUserFollowingObject])
  @UseGuards(AuthGuard)
  async getUserFollowing(
    @Args('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const data = await firstValueFrom(
        this.userService.send(
          {
            cmd: 'get_user_following',
          },
          {
            currentUserId: user._id,
            userId,
          },
        ),
      );
      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }

  @Query(() => [GetUserFollowingObject])
  @UseGuards(AuthGuard)
  async getUserFollowers(
    @Args('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const data = await firstValueFrom(
        this.userService.send(
          {
            cmd: 'get_user_followers',
          },
          {
            currentUserId: user._id,
            userId,
          },
        ),
      );
      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }

  @Query(() => GetSearchForUserObject)
  @UseGuards(AuthGuard)
  async getSearchForUser(
    @Args('input') input: GetSearchForUserInput,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const data = await firstValueFrom(
        this.userService.send(
          {
            cmd: 'search_for_user',
          },
          {
            ...input,
          },
        ),
      );
      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }

  @Query(() => [User])
  @UseGuards(AuthGuard)
  async getFriendSuggestions(@CurrentUser() user: any) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const data = await firstValueFrom(
        this.userService.send(
          {
            cmd: 'get_friend_suggestions',
          },
          {
            userId: user._id,
          },
        ),
      );
      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async updateUserStatus(
    @Args('status') status: string,
    @CurrentUser() user: any,
  ): Promise<boolean> {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const data = await firstValueFrom<boolean>(
        this.userService.send(
          {
            cmd: 'update_user_status',
          },
          {
            userId: user._id,
            status: status,
          },
        ),
      );
      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }

  @Query(() => String)
  @UseGuards(AuthGuard)
  async getUserStatus(@CurrentUser() user: any): Promise<string> {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const data = await firstValueFrom<string>(
        this.userService.send(
          {
            cmd: 'get_user_status',
          },
          {
            userId: user._id,
          },
        ),
      );
      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }

  @UseGuards(AuthGuard)
  @Subscription(() => ChangeUserStatusObject, {
    filter: async function (payload, variables, context) {
      const { req, res } = context;
      if (!req?.user) {
        throw new BadRequestException();
      }

      return payload.changeUserStatus.userId == variables.userId;
    },
  })
  changeUserStatus(@Args('userId') userId: string) {
    return this.pubSub.asyncIterator(CHANGE_USER_STATUS);
  }
}
