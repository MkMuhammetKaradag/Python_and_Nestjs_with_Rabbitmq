import { AuthGuard, Chat, CurrentUser } from '@app/shared';
import { Inject, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ClientProxy } from '@nestjs/microservices';
import { GraphQLError } from 'graphql';
import { firstValueFrom } from 'rxjs';

@Resolver('Chat')
export class ChatResolver {
  constructor(
    @Inject('CHAT_SERVICE') private readonly chatService: ClientProxy,
  ) {}

  @Mutation(() => Chat)
  @UseGuards(AuthGuard)
  async createChat(
    @Args('participantIds', { type: () => [String] }) participantIds: string[],
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const chat = await firstValueFrom<Chat>(
        this.chatService.send(
          {
            cmd: 'create_chat',
          },
          {
            participantIds: [...participantIds, user._id],
          },
        ),
      );
      return chat;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }
}
