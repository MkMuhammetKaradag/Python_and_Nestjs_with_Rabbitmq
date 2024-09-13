import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, MinLength } from 'class-validator';

@InputType()
export class GetSearchForUserInput {
  @Field()
  searchText: string;
  @Field()
  page: number;

  @Field()
  pageSize: number;
}
