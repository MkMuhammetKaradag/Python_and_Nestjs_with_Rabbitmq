import { Media } from '@app/shared/schemas/media.object';

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SearchUser {
  @Field(() => ID)
  _id: string;

  @Field({ nullable: true })
  profilePhoto?: string;

  @Field()
  followingCount: number;

  @Field()
  userName: string;
}
