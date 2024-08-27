import {
  Comment,
  CommentDocument,
  Like,
  LikeDocument,
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
    @InjectModel(Like.name, 'post')
    private postLikeModel: Model<LikeDocument>,
    @InjectModel(Comment.name, 'post')
    private postCommentModel: Model<CommentDocument>,
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
    try {
      const post = await this.postModel
        .findById(postId)
        .populate({
          path: 'user',
          select: '_id profilPhoto firstName lastName',
        })
        .populate({
          path: 'likes',
          select: '_id',
          model: 'Like',
        })
        .exec();
      console.log(post);
      return post;
    } catch (error) {
      console.log(error);
      throw new RpcException({
        message: 'Post Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
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

  async addLikePost(addLike: { postId: string; userId: string }) {
    const post = await this.postModel.findById(addLike.postId);
    const user = await this.userModel.findById(addLike.userId);

    if (!post || !user) {
      throw new RpcException({
        message: 'User or Post Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    try {
      const like = new this.postLikeModel({
        user: addLike.userId,
        post: addLike.postId,
      });

      const savedLike = await like.save();
      // Post'un likes alanını güncelle
      await this.postModel.findByIdAndUpdate(
        addLike.postId,
        { $addToSet: { likes: savedLike._id } },
        { new: true },
      );
      return savedLike;
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error code
        throw new RpcException({
          message: 'User has already liked this post',
          statusCode: HttpStatus.CONFLICT,
        });
      }
      throw error; // Diğer hataları fırlat
    }
  }

  async removeLikePost(removeData: { postId: string; userId: string }) {
    const post = await this.postModel.findById(removeData.postId);
    const user = await this.userModel.findById(removeData.userId);

    if (!post || !user) {
      throw new RpcException({
        message: 'User or Post Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    try {
      // Like'ı bul
      const like = await this.postLikeModel.findOne({
        user: removeData.userId,
        post: removeData.postId,
      });

      if (!like) {
        throw new RpcException({
          message: 'Like not found',
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      // Like'ı sil
      await this.postLikeModel.findByIdAndDelete(like._id);

      // Post'un likes dizisinden like'ı kaldır
      await this.postModel.findByIdAndUpdate(
        removeData.postId,
        { $pull: { likes: like._id } },
        { new: true },
      );

      return { success: true, message: 'Like removed successfully' };
    } catch (error) {
      throw new RpcException({
        message: 'Error removing like',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
    }
  }
}
