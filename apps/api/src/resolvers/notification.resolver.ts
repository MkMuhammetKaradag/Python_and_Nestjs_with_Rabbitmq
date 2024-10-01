import {
  ActivationUserInput,
  AuthGuard,
  Content,
  CurrentUser,
  ForgotPasswordInput,
  LoginUserInput,
  LoginUserObject,
  Notification,
  NotificationDocument,
  PUB_SUB,
  RegisterUserInput,
  RegisterUserObject,
  ResetPasswordInput,
  User,
} from '@app/shared';
import {
  Args,
  Context,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { CreateUserInput } from '../inputTypes/CreateUserInput';
import { BadRequestException, Inject, UseGuards } from '@nestjs/common';
import { ClientProxy, MessagePattern } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { GraphQLError } from 'graphql';
import { Response } from 'express';
import { RedisPubSub } from 'graphql-redis-subscriptions';

@Resolver(() => Notification)
export class NotificationResolver {
  constructor(
    @Inject('POST_SERVICE')
    private readonly postService: ClientProxy,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
  ) {}

  @Query(() => String)
  async getQuery() {
    return 'Hello World';
  }

  @Query(() => [Notification])
  @UseGuards(AuthGuard)
  async getNotifications(@CurrentUser() user: any) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const post = await firstValueFrom(
        this.postService.send(
          {
            cmd: 'get_notifications',
          },
          {
            currentUserId: user._id,
          },
        ),
      );
      return post;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: { ...error },
      });
    }
  }

  @ResolveField(() => Content, { nullable: true })
  async content(@Parent() notification: Notification) {
    // notification.contentType'dan doğrudan al
    const contentType = notification.contentType;

    const content = notification.content; // contentId'yi al
    if (!content) {
      return null;
    }
    // contentType'a göre doğru türü döndür
    switch (contentType) {
      case 'Post':
        return { ...content, __typename: 'Post' }; // __typename ekleyin
      case 'Like':
        return { ...content, __typename: 'Like' }; // __typename ekleyin
      case 'Comment':
        return { ...content, __typename: 'Comment' }; // __typename ekleyin
      default:
        return null; // Geçersiz türse null döndür
    }
  }

  @Mutation(() => String)
  @UseGuards(AuthGuard)
  async markNotificationAsRead(
    @Args('notificationId') notificationId: string,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const data = await firstValueFrom(
        this.postService.send(
          {
            cmd: 'mark_notification_as_read',
          },
          {
            notificationId,
          },
        ),
      );
      return data;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: { ...error },
      });
    }
  }

  @UseGuards(AuthGuard)
  @Subscription(() => Notification, {
    filter: async function (payload, variables, context) {
      const { req, res } = context;
      if (!req?.user) {
        throw new BadRequestException();
      }

      return payload.newNotification.recipient.toString() === req.user._id;
    },
  })
  newNotification() {
    return this.pubSub.asyncIterator('newNotification');
  }
}
