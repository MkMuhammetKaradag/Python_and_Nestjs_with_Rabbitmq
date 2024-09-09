import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, MinLength } from 'class-validator';

@InputType()
export class GetPostsFromFollowedUsersInput {
  @Field()
  page: number;

  @Field()
  pageSize: number;
}
