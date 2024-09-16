import { Media } from '@app/shared/schemas/media.object';

import { Field, ID, ObjectType } from '@nestjs/graphql';
import { DiscoverPosts } from './DiscoverPosts';
import { Comment } from '@app/shared/schemas/comment.schema';
import { Message } from '@app/shared/schemas/message.schema';

@ObjectType()
export class GetChatMessagesObject {
  @Field(() => [Message])
  messages: Message[];

  @Field()
  totalMessages: number;

  @Field()
  totalPages: number;

  @Field()
  currentPage: number;
}
