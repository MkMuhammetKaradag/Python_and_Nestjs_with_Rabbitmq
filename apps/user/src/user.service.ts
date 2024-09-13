import {
  FollowRequest,
  FollowRequestDocument,
  FollowRequestStatus,
  SharedService,
  User,
  UserDocument,
} from '@app/shared';
import {
  ConflictException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { GraphQLError } from 'graphql';
import { PipelineStage } from 'mongoose';
import { Model, Types } from 'mongoose';
interface AggregationResult {
  paginatedResults: User[];
  totalCount: { count: number }[];
}
@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name, 'user') private userModel: Model<UserDocument>,
    @InjectModel(FollowRequest.name, 'user')
    private followRequestModel: Model<FollowRequestDocument>,

    @Inject('POST_SERVICE')
    private readonly postServiceClient: ClientProxy,
  ) {}

  async followUser(currentUserId: string, targetUserId: string) {
    try {
      const [currentUser, targetUser] = await this.findUsers(
        currentUserId,
        targetUserId,
      );

      this.validateFollowAction(currentUser, targetUser);

      if (targetUser.isPrivate) {
        return await this.sendFollowRequest(currentUserId, targetUserId);
      } else {
        return await this.addFollower(currentUser, targetUser);
      }
    } catch (error) {
      this.handleUserActionError(
        error,
        'An error occurred during the user action',
      );
    }
  }

  async unFollowUser(currentUserId: string, targetUserId: string) {
    try {
      const [currentUser, targetUser] = await this.findUsers(
        currentUserId,
        targetUserId,
      );

      this.validateUnfollowAction(currentUser, targetUser);

      await this.removeFollower(currentUser, targetUser);

      return { message: 'User unfollowed successfully' };
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
      this.userModel.findById(currentUserId),
      this.userModel.findById(targetUserId),
    ]);

    if (!currentUser || !targetUser) {
      throw new RpcException({
        message: 'User Not found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    return [currentUser, targetUser];
  }
  private async findUser(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new RpcException({
        message: 'User Not found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    return user;
  }
  private validateFollowAction(currentUser: User, targetUser: User) {
    const isAlreadyFollowing = this.isUserFollowing(
      currentUser,
      targetUser._id.toString(),
    );
    if (isAlreadyFollowing) {
      throw new RpcException({
        message: 'You are already following this user',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
  }

  private validateUnfollowAction(currentUser: User, targetUser: User) {
    const isFollowing = this.isUserFollowing(
      currentUser,
      targetUser._id.toString(),
    );
    if (!isFollowing) {
      throw new RpcException({
        message: 'You are already not following this user',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
  }

  private isUserFollowing(user: User, targetUserId: string): boolean {
    const targetUserObjectId = new Types.ObjectId(targetUserId);
    return user.following.some((id) => id.equals(targetUserObjectId));
  }

  private async sendFollowRequest(currentUserId: string, targetUserId: string) {
    const existingRequest = await this.followRequestModel.findOne({
      from: currentUserId,
      to: targetUserId,
      status: { $in: ['pending', 'accepted'] },
    });

    if (existingRequest) {
      throw new RpcException({
        message: 'Follow request already exists or user is already followed',
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const newRequest = new this.followRequestModel({
      from: currentUserId,
      to: targetUserId,
      status: 'pending',
    });
    await newRequest.save();

    return { message: 'Follow request sent' };
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

    this.emitFollowEvent(currentUser._id.toString(), targetUser._id.toString());

    return { message: 'User followed successfully' };
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
    const payload = {
      followerId: currentUser._id.toString(),
      followedId: targetUser._id.toString(),
    };
    this.emitEvent('user_unFollowed', payload);
  }

  private emitFollowEvent(followerId: string, followedId: string) {
    this.postServiceClient.emit('user_followed', { followerId, followedId });
  }

  private emitEvent(cmd: string, payload: any) {
    // this.postServiceClient.emit('user_unFollowed', { followerId, followedId });
    this.postServiceClient.emit(cmd, payload);
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

  async acceptFollowRequest(currentUserId: string, requestId: string) {
    try {
      const request = await this.validateAndGetFollowRequest(
        currentUserId,
        requestId,
      );

      await this.updateFollowRequestStatus(
        request,
        FollowRequestStatus.ACCEPTED,
      );

      const [currentUser, follower] = await Promise.all([
        this.userModel.findById(currentUserId),
        this.userModel.findById(request.from),
      ]);

      await this.updateFollowRelationship(currentUser, follower);

      this.emitFollowEvent(currentUserId, request.from.toString());

      return { message: 'Follow request accepted' };
    } catch (error) {
      this.handleUserActionError(
        error,
        'An error occurred while processing the follow request',
      );
    }
  }
  private async updateFollowRelationship(
    currentUser: UserDocument,
    follower: UserDocument,
  ) {
    const followerId = new Types.ObjectId(follower._id);
    const currentUserId = new Types.ObjectId(currentUser._id);
    currentUser.followers.push(followerId);
    follower.following.push(currentUserId);

    await Promise.all([currentUser.save(), follower.save()]);
  }
  private async updateFollowRequestStatus(
    request: FollowRequestDocument,
    status: FollowRequestStatus,
  ) {
    request.status = status;
    await request.save();
  }
  private async validateAndGetFollowRequest(
    currentUserId: string,
    requestId: string,
  ) {
    const request = await this.followRequestModel.findById(requestId);
    console.log(requestId, currentUserId);
    if (
      !request ||
      request.to.toString() !== currentUserId ||
      request.status !== FollowRequestStatus.PENDING
    ) {
      throw new RpcException({
        message: 'Invalid follow request',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    return request;
  }
  async rejectFollowRequest(currentUserId: string, requestId: string) {
    try {
      const request = await this.validateAndGetFollowRequest(
        currentUserId,
        requestId,
      );

      await this.updateFollowRequestStatus(
        request,
        FollowRequestStatus.REJECTED,
      );

      return { message: 'Follow request rejected' };
    } catch (error) {
      this.handleUserActionError(
        error,
        'An error occurred while processing the follow request',
      );
    }
  }

  async getFollowRequests(currentUserId: string) {
    return this.followRequestModel
      .find({ to: currentUserId, status: 'pending' })
      .populate('from', 'firstName lastName profilePhoto');
  }

  async setUserProfilePrivate(currentUserId: string, isPrivate: boolean) {
    try {
      const user = await this.findUser(currentUserId);

      if (user.isPrivate === isPrivate) {
        throw new RpcException({
          message: `User profile is already ${isPrivate}`,
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }
      user.isPrivate = isPrivate;
      await user.save();
      this.emitEvent('user_isPrivate', { currentUserId, isPrivate });
      return 'user tes private success';
    } catch (error) {
      throw new RpcException({
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async getUserProfile(currentUserId: string, userId: string) {
    const pipeline = [
      { $match: { _id: new Types.ObjectId(userId) } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'following',
          as: 'followers',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'following',
          foreignField: '_id',
          as: 'following',
        },
      },
      {
        $addFields: {
          isFollowing: {
            $in: [new Types.ObjectId(currentUserId), '$followers._id'],
          },
          isCurrentUser: {
            $eq: [new Types.ObjectId(currentUserId), '$_id'],
          },
          followersCount: { $size: '$followers' },
          followingCount: { $size: '$following' },
        },
      },
      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          isPrivate: 1,
          isFollowing: 1,
          profilePhoto: 1,
          roles: 1,
          followersCount: 1,
          followingCount: 1,
          createdAt: 1,
          // Diğer tüm alanları da ekleyin
          restricted: {
            $cond: {
              if: {
                $and: [
                  { $eq: ['$isPrivate', true] },
                  { $eq: ['$isFollowing', false] },
                  { $eq: ['$isCurrentUser', false] },
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
          firstName: 1,
          lastName: 1,
          email: { $cond: ['$restricted', null, '$email'] },
          isPrivate: 1,
          isFollowing: 1,
          profilePhoto: { $cond: ['$restricted', null, '$profilePhoto'] },
          createdAt: 1,
          roles: { $cond: ['$restricted', null, '$roles'] },
          followersCount: { $cond: ['$restricted', null, '$followersCount'] },
          followingCount: { $cond: ['$restricted', null, '$followingCount'] },
          // Diğer alanları da ekleyin ve gerekiyorsa restricted koşuluna göre null yapın
          restricted: 1,
        },
      },
    ];

    const result = await this.userModel.aggregate(pipeline);

    return result.length > 0 ? result[0] : null;
  }
  async getUserFollowing(currentUserId: string, userId: string) {
    const pipeline = [
      {
        $match: { _id: new Types.ObjectId(userId) },
      },
      {
        $lookup: {
          from: 'users',
          let: { followingIds: '$following' },
          pipeline: [
            { $match: { $expr: { $in: ['$_id', '$$followingIds'] } } },
            {
              $project: {
                _id: 1,
                firstName: 1,
                lastName: 1,
                profilePhoto: 1,
                followers: 1,
              },
            }, // Sadece gerekli alanlar
          ],
          as: 'following',
        },
      },
      {
        $addFields: {
          following: {
            $map: {
              input: '$following',
              as: 'followedUser',
              in: {
                _id: '$$followedUser._id',
                firstName: '$$followedUser.firstName',
                lastName: '$$followedUser.lastName',
                profilePhoto: '$$followedUser.profilePhoto',
                isFollowing: {
                  $in: [
                    new Types.ObjectId(currentUserId),
                    '$$followedUser.followers',
                  ],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          'following._id': 1,
          'following.lastName': 1,
          'following.firstName': 1,
          'following.profilePhoto': 1,
          'following.isFollowing': 1,
        },
      },
    ];
    const result = await this.userModel.aggregate(pipeline);
    return result.length > 0 ? result[0].following : null;
  }

  async getUserFollowers(currentUserId: string, userId: string) {
    const pipeline = [
      {
        $match: { _id: new Types.ObjectId(userId) }, // Belirli kullanıcıyı bul
      },
      {
        $lookup: {
          from: 'users',
          let: { followerIds: '$followers' }, // 'followers' dizisi ile eşleştir
          pipeline: [
            { $match: { $expr: { $in: ['$_id', '$$followerIds'] } } },
            {
              $project: {
                _id: 1,
                firstName: 1,
                lastName: 1,
                profilePhoto: 1,
                following: 1, // Bu kullanıcının kimleri takip ettiğini de projekte et
              },
            }, // Sadece gerekli alanlar
          ],
          as: 'followers', // 'followers' verisi burada toplanacak
        },
      },
      {
        $addFields: {
          followers: {
            $map: {
              input: '$followers',
              as: 'followerUser',
              in: {
                _id: '$$followerUser._id',
                firstName: '$$followerUser.firstName',
                lastName: '$$followerUser.lastName',
                profilePhoto: '$$followerUser.profilePhoto',
                isFollowing: {
                  $in: [
                    new Types.ObjectId(currentUserId),
                    '$$followerUser.following', // Şu anki kullanıcının takip ettiklerine bakılıyor
                  ],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          'followers._id': 1,
          'followers.firstName': 1,
          'followers.lastName': 1,
          'followers.profilePhoto': 1,
          'followers.isFollowing': 1,
        },
      },
    ];
    const result = await this.userModel.aggregate(pipeline);
    return result.length > 0 ? result[0].followers : null;
  }

  async searchForUser(
    searchText: string,
    page: number = 1,
    pageSize: number = 10,
  ) {
    if (searchText.length < 3) {
      throw new RpcException({
        message: 'search text cannot be less than 3 characters',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const skip = (page - 1) * pageSize;
    const limit = pageSize;

    const pipeline: PipelineStage[] = [
      {
        $match: {
          $or: [
            { userName: { $regex: searchText, $options: 'i' } },
            { email: { $regex: searchText, $options: 'i' } },
          ],
        },
      },
      {
        $addFields: {
          followingCount: { $size: '$following' },
        },
      },
    ];
    const results = await this.userModel.aggregate<AggregationResult>([
      ...pipeline,
      {
        $facet: {
          paginatedResults: [
            { $sort: { followingCount: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                firstName: 1,
                lastName: 1,
                userName: 1,
                followingCount: 1,
                profilePhoto: 1,
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
    const users = results[0].paginatedResults;
    const totalCount = results[0].totalCount[0]?.count || 0;

    return { users, totalCount };
  }
}
