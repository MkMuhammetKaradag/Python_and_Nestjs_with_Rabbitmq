import {
  Comment,
  CommentDocument,
  Like,
  LikeDocument,
  NotificationType,
  Post,
  PostDocument,
  PostStatus,
  PUB_SUB,
  User,
  UserDocument,
  UserPostView,
  UserPostViewDocument,
} from '@app/shared';

import { HttpStatus, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Model, Types } from 'mongoose';

import { PipelineStage } from 'mongoose';

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
    @InjectModel(UserPostView.name, 'post')
    private userPostViewModel: Model<UserPostViewDocument>,

    @Inject('POST_SERVICE')
    private readonly postServiceClient: ClientProxy,

    @Inject(PUB_SUB)
    private readonly pubSub: RedisPubSub,
  ) {}

  async updateUserInterests(userId: string): Promise<string[]> {
    const user = await this.postUserModel.findById(userId);
    if (!user) {
      throw new RpcException({
        message: 'User  Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    // Get most liked posts
    const likedPosts = await this.postModel.aggregate([
      {
        $lookup: {
          from: 'likes',
          localField: '_id',
          foreignField: 'post',
          as: 'likes',
        },
      },
      {
        $unwind: '$likes',
      },
      {
        $match: {
          'likes.user': new Types.ObjectId(userId),
        },
      },
      {
        $sort: {
          'likes.createdAt': -1, // The most recently liked posts will appear first
        },
      },
      {
        $group: {
          _id: '$_id',
          tags: { $first: '$tags' },
          likeDate: { $first: '$likes.createdAt' },
        },
      },
      {
        $sort: {
          likeDate: -1, // We are re-sorting because $group operation can break the sorting
        },
      },
      {
        $limit: 10,
      },
      {
        $project: {
          tags: 1,
          _id: 1,
        },
      },
    ]);

    // Get most visited posts by user
    const mostViewedPosts = await this.userPostViewModel
      .find({ user: userId })
      .sort({ viewCount: -1 })
      .limit(10)
      .populate('post', 'tags')
      .lean();

    // Collect and count all tags
    const tagCounts = new Map<string, number>();
    likedPosts.forEach((post) => {
      post.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    mostViewedPosts.forEach((view) => {
      (view.post as any).tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    // Get the 10 most popular tags
    const topInterests = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);

    // Update user's interests
    user.interests = topInterests;
    user.viewCountSinceLastUpdate = 0;
    user.likeCountSinceLastUpdate = 0;
    await user.save();
    // await this.userModel.findByIdAndUpdate(userId, {
    //   $set: { viewCountSinceLastUpdate: 0, likeCountSinceLastUpdate: 0 },
    // });

    return topInterests;
  }

  async recordPostView(userId: string, postId: string): Promise<void> {
    const [existingView, user] = await Promise.all([
      this.userPostViewModel.findOne({ user: userId, post: postId }),
      this.userModel.findById(userId),
    ]);

    if (existingView) {
      existingView.viewCount += 1;
      await existingView.save();
    } else {
      await this.userPostViewModel.create({ user: userId, post: postId });
    }

    user.viewCountSinceLastUpdate += 1;
    await user.save();

    if (user.viewCountSinceLastUpdate >= 50) {
      await this.updateUserInterests(userId);
    }
  }

  //post creation function
  async createPost(createPost: {
    userId: string;
    title: string;
    tags: string[];
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
      tags: createPost.tags,
      media: createPost.media,
    });
    return await post.save();
  }

  // post pull function
  async getPost(postId: string, currentUserId: string) {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          _id: new Types.ObjectId(postId),
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
        $unwind: '$user',
      },
      {
        $lookup: {
          from: 'likes',
          localField: '_id',
          foreignField: 'post',
          as: 'likes',
        },
      },
      {
        $lookup: {
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
          likeCount: { $size: '$likes' },
          commentCount: { $size: { $ifNull: ['$comments', []] } },
          isLiked: {
            $in: [new Types.ObjectId(currentUserId), '$likes.user'],
          },
        },
      },
      {
        $project: {
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
    this.recordPostView(currentUserId, postId);
    return posts[0];
  }

  async getPostsILiked(currentUserId: string) {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          user: new Types.ObjectId(currentUserId),
        },
      },
      {
        $lookup: {
          from: 'posts',
          localField: 'post',
          foreignField: '_id',
          as: 'post',
        },
      },
      {
        $unwind: '$post', // Her bir post için belgeyi aç
      },
      // {
      //   $lookup: {
      //     from: 'users', // users koleksiyonundan kullanıcı bilgilerini getir
      //     localField: 'post.user', // post.user alanına bak
      //     foreignField: '_id', // users koleksiyonundaki _id ile eşleştir
      //     as: 'postUser', // Sonucu 'postUser' olarak al
      //   },
      // },
      // {
      //   $unwind: {
      //     path: '$postUser', // Tek bir kullanıcı bekliyoruz, diziyi açalım
      //     preserveNullAndEmptyArrays: true, // Eğer kullanıcı bulunamazsa boş bırak
      //   },
      // },
      {
        $addFields: {
          firstMedia: { $arrayElemAt: ['$post.media', 0] },
          likeCount: { $size: { $ifNull: ['$post.likes', []] } },
          commentCount: { $size: { $ifNull: ['$post.comments', []] } },
          _id: '$post._id', // _id alanını post._id ile değiştir
        },
      },
      {
        $project: {
          _id: 1,
          // 'post.title': 1,
          firstMedia: 1,
          likeCount: 1,
          commentCount: 1,
          // 'postUser._id': 1, // Kullanıcı ID'si
          // 'postUser.firstName': 1, // Kullanıcının adı
          // 'postUser.lastName': 1, // Kullanıcının soyadı
          // 'postUser.email': 1, // Kullanıcının email'i
        },
      },
    ];
    const posts = await this.postLikeModel.aggregate(pipeline);

    if (posts.length === 0) {
      throw new RpcException({
        message: 'Post Not Found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return posts;
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
    const isLiked = await this.postLikeModel.findOne({
      post: post._id,
      user: user._id,
    });
    // if (post.likes.includes(new Types.ObjectId(addLike.userId))) {
    //   throw new RpcException({
    //     message: 'User has  liked this post',
    //     statusCode: HttpStatus.BAD_REQUEST,
    //   });
    // }
    if (isLiked) {
      throw new RpcException({
        message: 'User has  liked this post',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    const postLike = new this.postLikeModel({
      post: post._id,
      user: user._id,
    });
    // if the user has not liked the post before, add the like to the post
    await postLike.save();

    await this.postModel.findByIdAndUpdate(
      addLike.postId,
      { $addToSet: { likes: postLike._id } },
      { new: true },
    );

    user.likeCountSinceLastUpdate += 1;
    await user.save();

    if (user.likeCountSinceLastUpdate >= 10) {
      await this.updateUserInterests(user._id);
    }

    this.notificationEmitEvent('create_notification', {
      senderId: user._id,
      recipientId: post.user,
      type: NotificationType.LIKE,
      content: {
        _id: post._id,
        createdAt: postLike.createdAt,
      },
      contentType: 'Post',
      message: `${user.userName} gönderinizi beğendi.`,
    });
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

    // if (!post.likes.includes(new Types.ObjectId(removeData.userId))) {
    //   throw new RpcException({
    //     message: 'User has not liked this post',
    //     statusCode: HttpStatus.BAD_REQUEST,
    //   });
    // }

    const deletedLike = await this.postLikeModel.findOneAndDelete({
      post: post._id,
      user: user._id,
    });

    if (!deletedLike) {
      throw new RpcException({
        message: 'User has not liked this post',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    await this.postModel.findByIdAndUpdate(
      removeData.postId,
      { $pull: { likes: deletedLike._id } },
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
        postId: post._id,
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
    this.notificationEmitEvent('create_notification', {
      senderId: user._id,
      recipientId: post.user,
      type: NotificationType.COMMENT,
      content: {
        _id: post._id,
        content: savedComment.content,
      },
      contentType: 'Post',
      message: `${user.userName} gönderinize yorum yaptı`,
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
        $lookup: {
          from: 'likes',
          localField: '_id',
          foreignField: 'post',
          as: 'likes',
        },
      },
      {
        $addFields: {
          likeCount: { $size: { $ifNull: ['$likes', []] } },
          commentCount: { $size: { $ifNull: ['$comments', []] } },
          isLiked: {
            $in: [new Types.ObjectId(userId), '$likes.user'],
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
          // $or: [
          //   { tags: { $in: user.interests } },
          //   {
          //     'userInfo._id': {
          //       $in: user.following.map((id) => new Types.ObjectId(id)),
          //     },
          //   },
          //   {
          //     user: { $in: user.following.map((id) => new Types.ObjectId(id)) },
          //   },
          // ],
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
          daysSinceCreation: {
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
                $multiply: [
                  { $subtract: [30, { $min: ['$daysSinceCreation', 30] }] },
                  5, // Tarih etkisini artırmak için çarpan
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

  private notificationEmitEvent(cmd: string, payload: any) {
    this.postServiceClient.emit(cmd, payload);
  }
}
