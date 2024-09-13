import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AddMessageToChatInput {
  @Field(() => String)
  chatId: string;

  @Field(() => String)
  content: string;
}
