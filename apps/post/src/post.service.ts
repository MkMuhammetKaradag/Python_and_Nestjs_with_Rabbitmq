import { Post, PostDocument, Product, User, UserDocument } from '@app/shared';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class PostService {
  constructor(
    @InjectModel(User.name, 'user')
    private userModel: Model<UserDocument>, // AUTH veritabanından User modeli
    @InjectModel(Post.name, 'post')
    private postModel: Model<PostDocument>,
  ) {}
  async createPost(createPost: {
    userId: string;
    title: string;
    medis: [
      {
        url: string;
        type: string;
      },
    ];
  }) {
    const post = new this.postModel(createPost);
    return await post.save();
  }
}
