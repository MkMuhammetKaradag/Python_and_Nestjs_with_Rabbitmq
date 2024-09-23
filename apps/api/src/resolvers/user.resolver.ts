import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import {
  AuthGuard,
  CurrentUser,
  FollowRequest,
  GetSearchForUserInput,
  GetSearchForUserObject,
  GetUserFollowingObject,
  GetUserProfileObject,
  UpdateUserProfileInput,
  User,
} from '@app/shared';
import { ClientProxy } from '@nestjs/microservices';
import { GraphQLError } from 'graphql';
import { firstValueFrom } from 'rxjs';

@Resolver('User')
export class UserResolver {
  constructor(
    @Inject('USER_SERVICE')
    private readonly userService: ClientProxy,
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
}
