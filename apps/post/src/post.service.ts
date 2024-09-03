import {
  Comment,
  CommentDocument,
  CreateCommentInput,
  Like,
  LikeDocument,
  Post,
  PostDocument,
  PostStatus,
  Product,
  PUB_SUB,
  User,
  UserDocument,
  UserRole,
} from '@app/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Model, Types } from 'mongoose';
import path from 'path';
import { StringifyOptions } from 'querystring';
import { PipelineStage } from 'mongoose';
const CREATE_COMMENT_POST = 'createCommentPost';
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

    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
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
      user: new Types.ObjectId(createPost.userId),
      title: createPost.title,
      media: createPost.media,
    });
    return await post.save();
  }

  async getPost(postId: string, currentUserId: string) {
    try {
      const post = await this.postModel
        .findById(postId)
        .populate({
          path: 'user',
          select: '_id profilPhoto firstName lastName isPrivate followers',
        })
        .populate({
          path: 'likes',
          select: '_id',
          model: 'Like',
        })
        .populate({
          path: 'comments',
          select: '_id content createdAt user',
          populate: {
            path: 'user',
            select: '_id email ',
          },
          model: 'Comment',
        })
        .exec();

      const postOwner = await this.userModel.findById(post.user._id);
      const canViewPostOwner = this.canViewProfile(
        postOwner,
        currentUserId,
        postOwner._id.toString(),
      );
      if (!post || !canViewPostOwner) {
        throw new RpcException({
          message: 'Post Not Found',
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      return post;
    } catch (error) {
      console.log(error);
      throw new RpcException({
        message: 'Post Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
  }
  private canViewProfile(
    user,
    currentUserId: string,
    postOwnerId: string,
  ): boolean {
    // Eğer profil mevcut kullanıcıya aitse veya mevcut kullanıcı post sahibiyse, her zaman görüntüleyebilir
    if (
      user._id.toString() === currentUserId ||
      currentUserId === postOwnerId
    ) {
      return true;
    }

    if (!user.isPrivate) {
      return true; // Profil gizli değilse herkes görebilir
    }

    // Profil gizliyse, sadece takipçiler görebilir
    return user.followers.some(
      (follower) => follower.toString() === currentUserId,
    );
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

  async createComment(createCommnetData: {
    userId: string;
    postId: string;
    content: string;
  }) {
    const post = await this.postModel.findById(createCommnetData.postId);
    const user = await this.userModel.findById(createCommnetData.userId);

    if (!post || !user) {
      throw new RpcException({
        message: 'User or Post Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    const newComment = new this.postCommentModel({
      user: createCommnetData.userId,
      post: createCommnetData.postId,
      content: createCommnetData.content,
    });
    const savedComment = await newComment.save();
    await this.postModel.findByIdAndUpdate(
      createCommnetData.postId,
      { $addToSet: { comments: savedComment._id } },
      { new: true },
    );

    this.pubSub.publish(CREATE_COMMENT_POST, {
      createCommentPost: {
        _id: savedComment._id,
        content: savedComment.content,
      },
    });

    return savedComment;
  }

  async updateComment(updateCommnetData: {
    userId: string;
    commentId: string;
    content: string;
  }) {
    const comment = await this.postCommentModel.findOne({
      _id: updateCommnetData.commentId,
      user: updateCommnetData.userId,
    });

    if (!comment) {
      throw new RpcException({
        message: 'Comment Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    comment.content = updateCommnetData.content;
    const updatedComment = await comment.save();
    return updatedComment;
  }

  async getPostsFromFollowedUsers(
    userId: string,
    page: number = 1,
    pageSize: number = 10,
  ) {
    // Kullanıcının takip ettiği kullanıcıları alın
    const user = await this.postUserModel
      .findById(userId)
      .populate('following')
      .exec();

    if (!user) {
      throw new RpcException({
        message: 'User Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    // const followingIds = user.following.map((followedUser) => followedUser._id);

    // Sayfalama parametrelerini ayarlayın
    const skip = (page - 1) * pageSize;
    const limit = pageSize;

    // Takip ettiği kullanıcıların postlarını alın,
    const posts = await this.postModel
      .find({ user: { $in: user.following } })
      .skip(skip)
      .limit(limit)
      .populate('user')
      .exec();

    return posts;
  }

  async discoverPosts(
    userId: string,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<Post[]> {
    const user = await this.postUserModel
      .findById(userId)
      .populate('interests');

    const skip = (page - 1) * pageSize;
    const limit = pageSize;
    console.log('User interests:', user.interests);
    console.log('User following:', user.following);

    let pipeline: PipelineStage[] = [
      {
        $match: {
          status: PostStatus.DRAFT,
        },
      },
      {
        $lookup: {
          from: 'users', // Emin olun ki bu, User modelinizin koleksiyon adıyla eşleşiyor
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      {
        $unwind: {
          path: '$userInfo',
          preserveNullAndEmptyArrays: true, // Bu, eşleşme olmasa bile belgeyi korur
        },
      },
      {
        $match: {
          $or: [{ userInfo: { $exists: true } }, { user: { $exists: true } }],
        },
      },
    ];

    let posts = await this.postModel.aggregate(pipeline);
    // console.log('Number of posts after user lookup:', posts);

    // if (posts.length > 0) {
    //   console.log('Sample post:', JSON.stringify(posts[0], null, 2));
    // }

    if (posts.length === 0) {
      return [];
    }

    // Gizlilik ve takip filtrelerini ekleyelim
    pipeline.push({
      $match: {
        $or: [
          { tags: { $in: user.interests } },
          {
            'userInfo._id': {
              $in: user.following.map((id) => new Types.ObjectId(id)),
            },
          },
          { user: { $in: user.following.map((id) => new Types.ObjectId(id)) } },
        ],
        $and: [
          {
            $or: [
              { 'userInfo.isPrivate': { $ne: true } },
              { 'userInfo._id': new Types.ObjectId(user._id) },
              {
                'userInfo._id': {
                  $in: user.following.map((id) => new Types.ObjectId(id)),
                },
              },
              { user: new Types.ObjectId(user._id) },
              {
                user: {
                  $in: user.following.map((id) => new Types.ObjectId(id)),
                },
              },
            ],
          },
        ],
      },
    } as PipelineStage);

    posts = await this.postModel.aggregate(pipeline);
    console.log(
      'Number of posts after privacy and following filters:',
      posts.length,
    );

    if (posts.length === 0) {
      return [];
    }

    // Skor hesaplama ve sıralama kısmını ekleyin (önceki koddan)
    pipeline.push(
      {
        $addFields: {
          likeCount: { $size: { $ifNull: ['$likes', []] } },
          commentCount: { $size: { $ifNull: ['$comments', []] } },
          firstMedia: { $arrayElemAt: ['$media', 0] },
          matchingTags: {
            $size: {
              $setIntersection: ['$tags', user.interests],
            },
          },
          isFollowing: {
            $cond: {
              if: {
                $in: [
                  '$userInfo._id',
                  user.following.map((id) => new Types.ObjectId(id)),
                ],
              },
              then: 1,
              else: 0,
            },
          },
        },
      } as PipelineStage,
      {
        $addFields: {
          score: {
            $add: [
              // { $size: { $ifNull: ['$likes', []] } },
              // { $multiply: [{ $size: { $ifNull: ['$comments', []] } }, 2] },
              '$likeCount',
              { $multiply: ['$commentCount', 2] },
              { $multiply: ['$matchingTags', 10] },
              { $multiply: ['$isFollowing', 20] },
              {
                $divide: [
                  {
                    $subtract: [
                      new Date(),
                      { $ifNull: ['$createdAt', new Date()] },
                    ],
                  },
                  1000 * 60 * 60 * 24,
                ],
              },
            ],
          },
        },
      } as PipelineStage,
      {
        $sort: { score: -1 },
      } as PipelineStage,
      {
        $limit: limit,
      } as PipelineStage,
      {
        $project: {
          _id: 1,
          likeCount: 1,
          commentCount: 1,
          firstMedia: 1,
          score:1
        },
      } as PipelineStage,
    );

    posts = await this.postModel.aggregate(pipeline);
    return posts;
  }
}
