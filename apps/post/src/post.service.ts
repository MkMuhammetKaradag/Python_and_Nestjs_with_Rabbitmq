import {
  Comment,
  CommentDocument,
  Like,
  LikeDocument,
  Post,
  PostDocument,
  PostStatus,
  PUB_SUB,
  SharedService,
  User,
  UserDocument,
  UserRole,
} from '@app/shared';
import { HttpStatus, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Model, Types } from 'mongoose';
import path from 'path';
import { StringifyOptions } from 'querystring';
import { PipelineStage } from 'mongoose';
import { userInfo } from 'os';
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

  //post creation function
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
    // ull the user who will create the post
    const existingUser = await this.postUserModel.findById(createPost.userId);
    if (!existingUser) {
      throw new RpcException({
        message: 'User  Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    // create post
    const post = new this.postModel({
      user: new Types.ObjectId(createPost.userId),
      title: createPost.title,
      media: createPost.media,
    });
    return await post.save();
  }

  // post pull function
  async getPost(postId: string, currentUserId: string) {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          _id: new Types.ObjectId(postId), // Fetch data matched with postId
        },
      },
      {
        $lookup: {
          // Matching the post owner with the user table
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $lookup: {
          // Checking whether the user is following the owner of the post
          from: 'users',
          let: { userId: '$user._id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', new Types.ObjectId(currentUserId)] },
              },
            },
            {
              $project: {
                isFollowing: {
                  $in: ['$$userId', '$following'],
                },
              },
            },
          ],
          as: 'currentUser',
        },
      },
      {
        $unwind: '$currentUser',
      },
      {
        $match: {
          $or: [
            { 'user.isPrivate': { $ne: true } },
            { 'currentUser.isFollowing': true },
            { 'user._id': new Types.ObjectId(currentUserId) },
          ],
        },
      },
      {
        $addFields: {
          // Adding the number of likes and comments of the post as a new field
          likeCount: { $size: { $ifNull: ['$likes', []] } },
          commentCount: { $size: { $ifNull: ['$comments', []] } },
        },
      },
      {
        $project: {
          // determining areas to return
          _id: 1,
          title: 1,
          media: 1,
          tags: 1,
          createdAt: 1,
          likeCount: 1,
          commentCount: 1,
          'user._id': 1,
          'user.firstName': 1,
          'user.lastName': 1,
          'user.profilePhoto': 1,
        },
      },
    ];

    const posts = await this.postModel.aggregate(pipeline);

    if (posts.length === 0) {
      throw new RpcException({
        message: 'Post Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    return posts[0];
  }

  // user like function
  async addLikePost(addLike: { postId: string; userId: string }) {
    // the process of pulling the user and the post to be liked on
    const post = await this.postModel.findById(addLike.postId);
    const user = await this.userModel.findById(addLike.userId);

    if (!post || !user) {
      throw new RpcException({
        message: 'User or Post Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    try {
      // create like
      const like = new this.postLikeModel({
        user: addLike.userId,
        post: addLike.postId,
      });

      const savedLike = await like.save();
      // Update the likes field of the post
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

  //user like removal function
  async removeLikePost(removeData: { postId: string; userId: string }) {
    // the process of pulling the user and the post to be liked on
    const post = await this.postModel.findById(removeData.postId);
    const user = await this.userModel.findById(removeData.userId);

    if (!post || !user) {
      throw new RpcException({
        message: 'User or Post Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    try {
      //find likes
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

      // remove like
      await this.postLikeModel.findByIdAndDelete(like._id);

      // Remove like from post's likes array
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

  // Designed for user to comment on post
  async createComment(createCommnetData: {
    userId: string;
    postId: string;
    content: string;
  }) {
    // the process of pulling the user and the post to be commented on
    const post = await this.postModel.findById(createCommnetData.postId);
    const user = await this.userModel.findById(createCommnetData.userId);

    if (!post || !user) {
      throw new RpcException({
        message: 'User or Post Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    // create new comment
    const newComment = new this.postCommentModel({
      user: createCommnetData.userId,
      post: createCommnetData.postId,
      content: createCommnetData.content,
    });
    const savedComment = await newComment.save();

    //save created comment in post
    await this.postModel.findByIdAndUpdate(
      createCommnetData.postId,
      { $addToSet: { comments: savedComment._id } },
      { new: true },
    );

    // publish created comment
    this.pubSub.publish(CREATE_COMMENT_POST, {
      createCommentPost: {
        _id: savedComment._id,
        content: savedComment.content,
      },
    });

    return savedComment;
  }

  //Designed so that the user can edit their comments
  async updateComment(updateCommnetData: {
    userId: string;
    commentId: string;
    content: string;
  }) {
    // find user's comment
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

    // Change the comment content and save again.
    comment.content = updateCommnetData.content;
    const updatedComment = await comment.save();
    return updatedComment;
  }

  // Designed to display posts shared by users' friends on the home page
  async getPostsFromFollowedUsers(
    userId: string,
    page: number = 1,
    pageSize: number = 10,
  ) {
    // Get users that user is following
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

    // Set pagination parameters
    const skip = (page - 1) * pageSize;
    const limit = pageSize;

    // Let's take the owner of the post

    // Pipeline sadece takip edilen kullanıcıların postlarını çeker
    let pipeline: PipelineStage[] = [
      {
        $match: {
          status: PostStatus.DRAFT, // DRAFT yerine sadece yayımlanmış postları çek
          user: {
            $in: user.following.map((id) => new Types.ObjectId(id)),
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          likeCount: { $size: { $ifNull: ['$likes', []] } },
          commentCount: { $size: { $ifNull: ['$comments', []] } },
        },
      },
      {
        $sort: { createdAt: -1 }, // Postları en yeniye göre sırala
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $project: {
          _id: 1,
          likeCount: 1,
          commentCount: 1,
          title: 1,
          media: 1,
          user: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            profilePhoto: 1,
          },
        },
      },
    ];

    const posts = await this.postModel.aggregate(pipeline);

    return posts;
  }

  // The process of pulling posts according to the user's interests
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

    // Let's take the owner of the post
    let pipeline: PipelineStage[] = [
      {
        $match: {
          status: PostStatus.DRAFT,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      {
        $unwind: {
          path: '$userInfo',
          preserveNullAndEmptyArrays: true, // This preserves the document even if there is no match
        },
      },
      {
        $match: {
          $or: [{ userInfo: { $exists: true } }, { user: { $exists: true } }],
        },
      },
    ];

    // Let's add privacy and tracking filters
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

    // Add score calculation, new fields and ranking section
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
        $skip: skip,
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
          score: 1,
        },
      } as PipelineStage,
    );

    const posts = await this.postModel.aggregate(pipeline);
    return posts;
  }
}
