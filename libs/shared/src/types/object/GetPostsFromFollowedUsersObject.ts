import { Media } from '@app/shared/schemas/media.object';
import { User } from '@app/shared/schemas/user.schema';

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GetPostsFromFollowedUsersObject {
  @Field(() => ID)
  _id: string;

  @Field()
  likeCount: number;

  @Field()
  commentCount: number;

  @Field()
  title: string;

  @Field(() => User)
  user: User;

  @Field(() => [Media])
  media: Media[];
}
