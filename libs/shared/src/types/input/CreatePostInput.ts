import { IsArray, IsEmail, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../schemas/user.schema';
import { InputType, Field } from '@nestjs/graphql';
import { PostStatus } from '@app/shared/schemas/post.schema';
import { CreateMediaInput } from './CreateMediaInput';

@InputType()
export class CreatePostInput {
  @Field()
  title: string;

  @Field(() => [CreateMediaInput])
  media: CreateMediaInput[];
}
