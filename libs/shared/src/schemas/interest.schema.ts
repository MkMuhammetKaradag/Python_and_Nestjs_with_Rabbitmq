import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InterestDocument = Interest & Document;

@Schema()
@ObjectType()
export class Interest {
  @Field(() => ID)
  _id: string;

  @Prop({ required: true })
  @Field()
  name: string; // İlgi alanı adı (örneğin: Teknoloji, Spor)
}

export const InterestSchema = SchemaFactory.createForClass(Interest);
