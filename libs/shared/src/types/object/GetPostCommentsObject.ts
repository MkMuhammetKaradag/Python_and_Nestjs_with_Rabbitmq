import { Media } from '@app/shared/schemas/media.object';

import { Field, ID, ObjectType } from '@nestjs/graphql';
import { DiscoverPosts } from './DiscoverPosts';
import { Comment } from '@app/shared/schemas/comment.schema';

@ObjectType()
export class GetPostCommentsObject {
  @Field(() => [Comment])
  comments: Comment[];

  @Field()
  totalCount: number;
}
