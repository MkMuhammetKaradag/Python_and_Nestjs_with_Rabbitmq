import { MediaType } from '@app/shared/schemas/post.schema';
import { Field, InputType, ID } from '@nestjs/graphql';

@InputType()
export class CreateMediaInput {
  @Field(() => String)
  url: string;

  @Field(() => MediaType)
  type: MediaType;
}
