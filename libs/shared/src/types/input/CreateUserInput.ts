import { UserRole } from '../../schemas/user.schema';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateUserInput {
  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  email: string;

  @Field()
  password: string;

  @Field(() => [UserRole], { defaultValue: [UserRole.USER] })
  roles: UserRole[];
}
