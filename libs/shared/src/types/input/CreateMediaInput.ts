import { MediaType } from '@app/shared/schemas/media.object';
import { Field, InputType, ID } from '@nestjs/graphql';

@InputType()
export class CreateMediaInput {
  @Field(() => String)
  url: string;

  @Field(() => String)
  publicId: string;

  @Field(() => MediaType)
  type: MediaType;
}
