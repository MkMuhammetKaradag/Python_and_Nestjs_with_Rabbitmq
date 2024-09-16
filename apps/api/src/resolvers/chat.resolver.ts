import {
  AddMessageToChatInput,
  AuthGuard,
  Chat,
  CurrentUser,
  GetChatMessagesObject,
  GetUserChats,
  Message,
  PUB_SUB,
} from '@app/shared';
import { GetChatMessagesInput } from '@app/shared/types/input/GetChatMessagesInput';
import { BadRequestException, Inject, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { ClientProxy } from '@nestjs/microservices';
import { GraphQLError } from 'graphql';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { firstValueFrom } from 'rxjs';
const CREATE_MESSAGE = 'createMessageToChat';
@Resolver('Chat')
export class ChatResolver {
  constructor(
    @Inject('CHAT_SERVICE') private readonly chatService: ClientProxy,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
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

  @Mutation(() => Message)
  @UseGuards(AuthGuard)
  async addMessageToChat(
    @Args('input') input: AddMessageToChatInput,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const message = await firstValueFrom<Message>(
        this.chatService.send(
          {
            cmd: 'add_message_to_chat',
          },
          {
            ...input,
            senderId: user._id,
          },
        ),
      );
      return message;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }

  @UseGuards(AuthGuard)
  @Subscription(() => Message, {
    filter: async function (payload, variables, context) {
      const { req, res } = context;
      if (!req?.user) {
        throw new BadRequestException();
      }

      return payload.createMessageToChat.chatId == variables.chatId;
    },
  })
  createMessageToChat(@Args('chatId') chatId: string) {
    return this.pubSub.asyncIterator(CREATE_MESSAGE);
  }

  @Query(() => [GetUserChats])
  @UseGuards(AuthGuard)
  async getChats(@CurrentUser() user: any) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const chats = await firstValueFrom<Chat[]>(
        this.chatService.send(
          {
            cmd: 'get_chats',
          },
          {
            currentUserId: user._id,
          },
        ),
      );
      return chats;
    } catch (error) {
      throw new GraphQLError(error.message, {
        extensions: {
          ...error,
        },
      });
    }
  }

  @Query(() => GetChatMessagesObject)
  @UseGuards(AuthGuard)
  async getChatMessage(
    @Args('input') input: GetChatMessagesInput,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: { code: 'USER_NOT_FOUND' },
      });
    }
    try {
      const data = await firstValueFrom(
        this.chatService.send(
          {
            cmd: 'get_chat_messages',
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
