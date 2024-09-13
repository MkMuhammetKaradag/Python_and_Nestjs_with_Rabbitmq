import { Media } from '@app/shared/schemas/media.object';

import { Field, ID, ObjectType } from '@nestjs/graphql';

import { User } from '@app/shared/schemas/user.schema';
import { SearchUser } from './SearchUser';

@ObjectType()
export class GetSearchForUserObject {
  @Field(() => [SearchUser])
  users: SearchUser[];

  @Field()
  totalCount: number;
}
