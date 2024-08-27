import {
    Field,
    ObjectType,
    registerEnumType,
  } from '@nestjs/graphql';
  import { Prop } from '@nestjs/mongoose';

export enum MediaType {
    IMAGE = 'image',
    VIDEO = 'video',
  }
  
  registerEnumType(MediaType, {
    name: 'MediaType',
    description: 'Type of media content',
  });
  
  @ObjectType()
  export class Media {
    @Field(() => String)
    @Prop({ required: true })
    url: string; // Medya dosyasının URL'si
  
    @Field(() => MediaType)
    @Prop({ required: true, enum: MediaType })
    type: MediaType; // Medya türü (video veya fotoğraf)
  
    @Field({ nullable: true })
    @Prop()
    caption?: string; // Medya için açıklama (isteğe bağlı)
  }