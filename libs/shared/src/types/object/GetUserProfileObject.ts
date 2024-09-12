import { User } from '../../schemas/user.schema';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GetUserProfileObject {
  @Field(() => ID)
  _id: string;
  @Field()
  firstName: string;
  @Field()
  lastName: string;

  @Field({ nullable: true })
  email: string;

  @Field({ nullable: true })
  profilePhoto: string;

  @Field({ nullable: true })
  createdAt: string;

  @Field({ nullable: true })
  isPrivate: boolean;
  @Field({ nullable: true })
  followersCount: number;

  @Field({ nullable: true })
  followingCount: number;

  @Field({ nullable: true })
  isFollowing: boolean;

  @Field()
  restricted: boolean;
}
