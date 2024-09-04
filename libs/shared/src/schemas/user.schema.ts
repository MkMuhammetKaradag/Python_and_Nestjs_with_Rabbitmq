import {
  Field,
  HideField,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Interest } from './interest.schema';

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
  timestamps: true, // Otomatik olarak createdAt ve updatedAt alanlarını ekler
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
  profilePhoto: string;

  @Prop({ type: [String], enum: UserRole, default: [UserRole.USER] })
  @Field(() => [UserRole]) // GraphQL için enum dizisi olarak tanımlama
  roles: UserRole[];

  @Prop({ default: false })
  @Field()
  isDeleted: boolean;

  @Prop({ nullable: true })
  @Field(() => String, { nullable: true }) // Boş olabilir
  deletedAt?: Date;

  @Field() // GraphQL alanı olarak işaretleme
  createdAt: string;

  @Field() // GraphQL alanı olarak işaretleme
  updatedAt: string;

  // @Prop({ type: [{ type: Types.ObjectId, ref: 'Interest' }] })
  // @Field(() => [Interest], { nullable: true }) // Kullanıcının ilgi alanları
  // interests: Types.ObjectId[];

  @Prop({ type: [String] })
  @Field(() => [String])
  interests: string[];

  // Yeni eklenen alanlar
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  @Field(() => [User], { nullable: true })
  following: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  @Field(() => [User], { nullable: true })
  followers: Types.ObjectId[];

  @Prop({ default: false })
  @Field(() => Boolean)
  isPrivate: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
