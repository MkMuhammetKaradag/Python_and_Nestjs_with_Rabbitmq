import {
  Field,
  HideField,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

// Enum'u GraphQL ile kullanmak için kayıt ediyoruz
registerEnumType(UserRole, {
  name: 'UserRole', // GraphQL şemasındaki enum adı
  description: 'User roles', // Açıklama (opsiyonel)
});

@Schema({
  toJSON: {
    transform: (doc, ret) => {
      delete ret.password;
      return ret;
    },
  },
})
@ObjectType() // GraphQL ObjectType olarak işaretleme
export class User {
  @Field(() => ID)
  //@Prop()
  _id: string;

  @Prop({ required: true })
  @Field() // GraphQL alanı olarak işaretleme
  firstName: string;

  @Prop({ required: true })
  @Field()
  lastName: string;

  @Prop({ required: true })
  @Field()
  email: string;

  @Prop({ required: true })
  @HideField() // GraphQL sorgularında gizleme
  password: string;

  @Prop()
  @Field({ nullable: true }) // Boş olabilir
  profilePhoto: number;

  @Prop({ type: [String], enum: UserRole, default: [UserRole.USER] })
  @Field(() => [UserRole]) // GraphQL için enum dizisi olarak tanımlama
  roles: UserRole[];
}

export const UserSchema = SchemaFactory.createForClass(User);
