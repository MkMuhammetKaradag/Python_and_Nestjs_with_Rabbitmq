import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RemoveLikeObject {
  @Field()
  success: boolean;

  @Field()
  message: string;
}
