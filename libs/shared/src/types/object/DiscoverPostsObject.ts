import { Media } from '@app/shared/schemas/media.object';

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class DiscoverPostsObject {
  @Field(() => ID)
  _id: string;

  @Field()
  likeCount: number;

  @Field()
  commentCount: number;

  @Field()
  score: number;

  @Field(() => Media)
  firstMedia: Media;
}
