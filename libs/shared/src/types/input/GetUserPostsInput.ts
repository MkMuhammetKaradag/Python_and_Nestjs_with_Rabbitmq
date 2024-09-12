import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, MinLength } from 'class-validator';

@InputType()
export class GetUserPostsInput {
  @Field()
  userId: string;

  @Field()
  page: number;

  @Field()
  pageSize: number;
}
