import { Media } from '@app/shared/schemas/media.object';

import { Field, ID, ObjectType } from '@nestjs/graphql';
import { DiscoverPosts } from './DiscoverPosts';

@ObjectType()
export class DiscoverPostsObject {
  @Field(() => [DiscoverPosts])
  posts: DiscoverPosts[];

  @Field()
  totalCount: number;
}
