import { User } from '../../schemas/user.schema';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GetUserFollowingObject {
  @Field(() => ID)
  _id: string;
  @Field()
  firstName: string;
  @Field()
  lastName: string;

  @Field({ nullable: true })
  profilePhoto: string;

  @Field({ nullable: true })
  isFollowing: boolean;
}
