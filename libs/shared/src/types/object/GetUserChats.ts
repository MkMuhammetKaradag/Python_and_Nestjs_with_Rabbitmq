import { Media } from '@app/shared/schemas/media.object';
import { Message } from '@app/shared/schemas/message.schema';
import { User } from '@app/shared/schemas/user.schema';

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GetUserChats {
  @Field(() => ID)
  _id: string;

  @Field(() => [User])
  participants: User[];

  @Field(() => Message, { nullable: true })
  lastMessage: Message;
}
