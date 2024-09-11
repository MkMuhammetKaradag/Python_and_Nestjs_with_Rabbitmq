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

interface AggregationResult {
  paginatedResults: Post[];
  totalCount: { count: number }[];
}
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
          isLiked: {
            $cond: {
              if: {
                $in: [
                  new Types.ObjectId(currentUserId),
                  { $ifNull: ['$likes', []] },
                ],
              },
              then: true,
              else: false,
            },
          },
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
          isLiked: 1,
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
  async getPostComments(
    postId: string,
    currentUserId: string,
    page: number = 1,
    pageSize: number = 10,
    extraPassValue: number = 0,
  ) {
    const skip = (page - 1) * pageSize + extraPassValue;
    const limit = pageSize;
    const populatedComments = await this.postCommentModel
      .find({ post: postId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user')
      .exec();

    const totalComments = await this.postCommentModel.countDocuments({
      post: postId,
      isDeleted: false,
    });
    return {
      comments: populatedComments,
      totalCount: totalComments,
    };
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

    if (post.likes.includes(new Types.ObjectId(addLike.userId))) {
      throw new RpcException({
        message: 'User has  liked this post',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    await this.postModel.findByIdAndUpdate(
      addLike.postId,
      { $addToSet: { likes: user._id } },
      { new: true },
    );
    return 'success';
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

    if (!post.likes.includes(new Types.ObjectId(removeData.userId))) {
      throw new RpcException({
        message: 'User has not liked this post',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    await this.postModel.findByIdAndUpdate(
      removeData.postId,
      { $pull: { likes: user._id } },
      { new: true },
    );

    return { success: true, message: 'Like removed successfully' };
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
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePhoto: user.profilePhoto,
        },
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

    // Convert user's following list to ObjectId array
    const followingIds = user.following.map((id) => new Types.ObjectId(id));
    const userObjectId = new Types.ObjectId(userId);

    let pipeline: PipelineStage[] = [
      {
        $match: {
          status: PostStatus.DRAFT,
          user: { $in: followingIds },
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
          isLiked: {
            $cond: {
              if: { $in: [userObjectId, { $ifNull: ['$likes', []] }] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $sort: { createdAt: -1 },
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
          isLiked: 1,
          user: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            profilePhoto: 1,
          },
        },
      },
    ];

    // let pipeline: PipelineStage[] = [
    //   {
    //     $match: {
    //       status: PostStatus.DRAFT,
    //       user: { $in: followingIds },
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: 'users',
    //       localField: 'user',
    //       foreignField: '_id',
    //       as: 'user',
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: '$user',
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: 'likes',
    //       as: 'userLikes',
    //       let: { postId: '$_id', userId: userObjectId },
    //       pipeline: [
    //         {
    //           $match: {
    //             $expr: {
    //               $and: [
    //                 { $eq: ['$post', '$$postId'] },
    //                 { $eq: ['$user', '$$userId'] },
    //               ],
    //             },
    //           },
    //         },
    //         { $project: { _id: 1 } },
    //       ],
    //     },
    //   },
    //   {
    //     $addFields: {
    //       likeCount: { $size: { $ifNull: ['$likes', []] } },
    //       commentCount: { $size: { $ifNull: ['$comments', []] } },
    //       isLiked: { $gt: [{ $size: '$userLikes' }, 0] },
    //     },
    //   },
    //   {
    //     $sort: { createdAt: -1 },
    //   },
    //   {
    //     $skip: skip,
    //   },
    //   {
    //     $limit: limit,
    //   },
    //   {
    //     $project: {
    //       _id: 1,
    //       likeCount: 1,
    //       commentCount: 1,
    //       title: 1,
    //       media: 1,
    //       isLiked: 1,
    //       user: {
    //         _id: 1,
    //         firstName: 1,
    //         lastName: 1,
    //         profilePhoto: 1,
    //       },
    //     },
    //   },
    // ];

    const posts = await this.postModel.aggregate(pipeline);

    return posts;
  }

  // The process of pulling posts according to the user's interests

  async discoverPosts(
    userId: string,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<{ posts: Post[]; totalCount: number }> {
    const user = await this.postUserModel
      .findById(userId)
      .populate('interests');

    const skip = (page - 1) * pageSize;
    const limit = pageSize;

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
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          $or: [{ userInfo: { $exists: true } }, { user: { $exists: true } }],
        },
      },
      {
        $match: {
          $or: [
            { tags: { $in: user.interests } },
            {
              'userInfo._id': {
                $in: user.following.map((id) => new Types.ObjectId(id)),
              },
            },
            {
              user: { $in: user.following.map((id) => new Types.ObjectId(id)) },
            },
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
      },
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
      },
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
      },
    ];

    // Use facet to get both the paginated results and the total count
    const results = await this.postModel.aggregate<AggregationResult>([
      ...pipeline,
      {
        $facet: {
          paginatedResults: [
            { $sort: { score: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                likeCount: 1,
                commentCount: 1,
                firstMedia: 1,
                score: 1,
              },
            },
          ],
          totalCount: [
            {
              $count: 'count',
            },
          ],
        },
      },
    ]);

    const posts = results[0].paginatedResults;
    const totalCount = results[0].totalCount[0]?.count || 0;

    return { posts, totalCount };
  }
}
