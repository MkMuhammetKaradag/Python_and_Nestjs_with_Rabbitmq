import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, MinLength } from 'class-validator';

@InputType()
export class ForgotPasswordInput {
  @Field()
  @IsEmail()
  @MinLength(3)
  email: string;
}
