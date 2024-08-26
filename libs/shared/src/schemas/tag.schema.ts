import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TagDocument = Tag & Document;

@Schema()
@ObjectType()
export class Tag {
  @Field(() => ID)
  _id: string;

  @Prop({ required: true })
  @Field()
  name: string; // Etiket adı (örneğin: #Yemek, #Teknoloji)
}

export const TagSchema = SchemaFactory.createForClass(Tag);
