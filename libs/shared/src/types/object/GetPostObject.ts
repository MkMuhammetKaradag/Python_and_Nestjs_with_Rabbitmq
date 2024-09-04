import { Media } from '@app/shared/schemas/media.object';
import { User } from '../../schemas/user.schema';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GetPostObject {
  @Field(() => ID)
  _id: string;

  @Field()
  title: string;

  @Field(() => [String])
  tags: string[];

  @Field(() => [Media])
  media: Media[];

  @Field()
  createdAt: string;
  
  @Field()
  likeCount: number;

  @Field()
  commentCount: number;

  @Field(() => User)
  user: User;
}
