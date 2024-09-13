import {
  CurrentUser,
  Post,
  PostDocument,
  PostStatus,
  User,
  UserDocument,
  UserRole,
} from '@app/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { InjectModel } from '@nestjs/mongoose';

import { Model, PipelineStage, Types } from 'mongoose';
interface AggregationResult {
  paginatedResults: Post[];
  totalCount: { count: number }[];
}
@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name, 'post')
    private postUserModel: Model<UserDocument>,
    @InjectModel(Post.name, 'post')
    private postModel: Model<PostDocument>,
  ) {}
  // A function created to ensure data consistency in the post service when a new user registers in the auth service.
  async createUser({
    id,
    firstName,
    lastName,
    email,
    roles,
    password,
    userName,
  }: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: UserRole[];
    password: string;
    userName: string;
  }) {
    // create user
    const user = new this.postUserModel({
      _id: id,
      firstName,
      lastName,
      email,
      roles,
      userName,
      password: 'temporary',
    });
    await user.save();
  }
  async followUser(currentUserId: string, targetUserId: string) {
    try {
      const [currentUser, targetUser] = await this.findUsers(
        currentUserId,
        targetUserId,
      );
      await this.addFollower(currentUser, targetUser);
    } catch (error) {
      this.handleUserActionError(
        error,
        'An error occurred during the user action',
      );
    }
  }
  private async addFollower(
    currentUser: UserDocument,
    targetUser: UserDocument,
  ) {
    const currentUserObjectId = new Types.ObjectId(currentUser._id);
    const targetUserObjectId = new Types.ObjectId(targetUser._id);

    currentUser.following.push(targetUserObjectId);
    targetUser.followers.push(currentUserObjectId);

    await Promise.all([currentUser.save(), targetUser.save()]);
  }

  async unFollowUser(currentUserId: string, targetUserId: string) {
    try {
      const [currentUser, targetUser] = await this.findUsers(
        currentUserId,
        targetUserId,
      );

      await this.removeFollower(currentUser, targetUser);
    } catch (error) {
      this.handleUserActionError(
        error,
        'An error occurred during the user action',
      );
    }
  }

  private async findUsers(
    currentUserId: string,
    targetUserId: string,
  ): Promise<[UserDocument, UserDocument]> {
    const [currentUser, targetUser] = await Promise.all([
      this.postUserModel.findById(currentUserId),
      this.postUserModel.findById(targetUserId),
    ]);

    if (!currentUser || !targetUser) {
      throw new RpcException({
        message: 'User Not found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    return [currentUser, targetUser];
  }

  private async removeFollower(
    currentUser: UserDocument,
    targetUser: UserDocument,
  ) {
    const currentUserObjectId = currentUser._id;
    const targetUserObjectId = targetUser._id;

    currentUser.following = currentUser.following.filter(
      (id) => !id.equals(targetUserObjectId),
    );
    targetUser.followers = targetUser.followers.filter(
      (id) => !id.equals(currentUserObjectId),
    );

    await Promise.all([currentUser.save(), targetUser.save()]);
  }

  private handleUserActionError(error: any, message: string) {
    if (error instanceof RpcException) {
      throw error;
    }
    throw new RpcException({
      message,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }

  async changeUserProfilePrivate(currentUserId: string, isPrivate: boolean) {
    try {
      const user = await this.postUserModel.findById(currentUserId);
      user.isPrivate = isPrivate;
      await user.save();
    } catch (error) {
      throw new RpcException({
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async getUserPosts(
    currentUserId: string,
    userId: string,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const user = await this.postUserModel.findById(currentUserId);

    const skip = (page - 1) * pageSize;
    const limit = pageSize;

    let pipeline: PipelineStage[] = [
      {
        $match: {
          status: PostStatus.DRAFT,
          user: new Types.ObjectId(userId),
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
