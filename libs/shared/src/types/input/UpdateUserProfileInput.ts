import { InputType, Field, ID } from '@nestjs/graphql';
@InputType()
export class UpdateUserProfileInput {
  @Field()
  firstName: string;

  @Field()
  lastName: string;
  @Field()
  userName: string;

  @Field()
  isPrivate: boolean;
}
