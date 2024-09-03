import {
  createUnionType,
  Field,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Tag } from './tag.schema';
import { User } from './user.schema';
import { Media } from './media.object';
import { Like } from './like.schema';
import { Comment } from './comment.schema';

export type PostDocument = Post & Document;

export enum PostStatus {
  PUBLISHED = 'published',
  DRAFT = 'draft',
}

registerEnumType(PostStatus, {
  name: 'PostStatus',
  description: 'Status of the post',
});

@Schema({
  timestamps: true, // createdAt ve updatedAt alanları otomatik eklenir
})
@ObjectType()
export class Post {
  @Field(() => ID)
  _id: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  @Field(() => User)
  user: Types.ObjectId; // Kullanıcının ID'sini referans alır

  @Prop({ type: [Media], required: true })
  @Field(() => [Media]) // Birden fazla medya içeriği olabilir
  media: Media[]; // Medya içeriği (video veya fotoğraf)

  @Prop({ required: true })
  @Field()
  title: string; // Paylaşım başlığı

  @Prop({ type: String, enum: PostStatus, default: PostStatus.DRAFT })
  @Field(() => PostStatus)
  status: PostStatus; // Paylaşımın durumu

  @Field()
  createdAt: string;

  @Field()
  updatedAt: string;

  // @Prop({ type: [{ type: Types.ObjectId, ref: 'Tag' }] })
  // @Field(() => [Tag], { nullable: true }) // Paylaşımın etiketleri
  // tags: Types.ObjectId[];

  @Prop({ type: [String] })
  @Field(() => [String])
  tags: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Like' }] })
  @Field(() => [Like], { nullable: true })
  likes: Types.ObjectId[] | Like[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Comment' }] })
  @Field(() => [Comment], { nullable: true })
  comments: Types.ObjectId[];

  @Prop({ type: Number, default: 0 })
  @Field(() => Number)
  score: number;
}
export const PostSchema = SchemaFactory.createForClass(Post);
