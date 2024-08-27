import {
  Post,
  PostDocument,
  Product,
  User,
  UserDocument,
  UserRole,
} from '@app/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class PostService {
  constructor(
    @InjectModel(User.name, 'user')
    private userModel: Model<UserDocument>, // AUTH veritabanından User modeli
    @InjectModel(Post.name, 'post')
    private postModel: Model<PostDocument>,

    @InjectModel(User.name, 'post')
    private postUserModel: Model<UserDocument>,
  ) {}
  async createPost(createPost: {
    userId: string;
    title: string;
    media: [
      {
        url: string;
        type: string;
      },
    ];
  }) {
    const existingUser = await this.postUserModel.findById(createPost.userId);
    if (!existingUser) {
      throw new RpcException({
        message: 'User  Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    const post = new this.postModel({
      user: createPost.userId,
      title: createPost.title,
      media: createPost.media,
    });
    return await post.save();
  }

  async getPost(postId: string) {
    const post = await this.postModel.findById(postId).populate({
      path: 'user',
      select: 'firstName _id lastName profilePhoto',
    });

    return post;
  }

  async createUser({
    id,
    firstName,
    lastName,
    email,
    roles,
    password,
  }: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: UserRole[];
    password: string;
  }) {
    const user = new this.postUserModel({
      _id: id,
      firstName,
      lastName,
      email,
      roles,
      password: 'temporary',
    });
    await user.save();
    console.log('created user post ');
  }
}
