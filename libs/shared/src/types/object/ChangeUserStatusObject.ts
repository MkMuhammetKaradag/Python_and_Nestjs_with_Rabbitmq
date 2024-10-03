import { Media } from '@app/shared/schemas/media.object';

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ChangeUserStatusObject {
  @Field(() => ID)
  userId: string;

  @Field()
  status: string;
}
