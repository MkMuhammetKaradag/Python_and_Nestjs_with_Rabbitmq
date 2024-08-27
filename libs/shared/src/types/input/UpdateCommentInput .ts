import { InputType, Field, ID } from '@nestjs/graphql';
@InputType()
export class UpdateCommentInput {
  @Field(() => ID)
  commentId: string;

  @Field({ nullable: true })
  content?: string;

  @Field({ nullable: true })
  isDeleted?: boolean;
}
