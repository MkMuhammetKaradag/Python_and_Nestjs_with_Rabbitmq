import { InputType, Field, ID } from '@nestjs/graphql';
@InputType()
export class ChangeUserInterestsInput {
  @Field(() => [String])
  interests: string[];
}
