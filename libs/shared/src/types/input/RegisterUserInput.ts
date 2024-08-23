import { IsArray, IsEmail, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../schemas/user.schema';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class RegisterUserInput {
  @Field()
  @MinLength(3)
  firstName: string;

  @Field()
  @MinLength(3)
  lastName: string;

  @Field()
  @IsEmail()
  email: string;

  @Field()
  @MinLength(6)
  password: string;

  @Field(() => [UserRole], { defaultValue: [UserRole.USER] })
  @IsArray()
  @IsString({ each: true })
  roles: UserRole[];
}
