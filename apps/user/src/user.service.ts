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
import { Model, Types } from 'mongoose';

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

    this.emitUnfollowEvent(
      currentUser._id.toString(),
      targetUser._id.toString(),
    );
  }

  private emitFollowEvent(followerId: string, followedId: string) {
    this.postServiceClient.emit('user_followed', { followerId, followedId });
  }

  private emitUnfollowEvent(followerId: string, followedId: string) {
    console.log('ok');
    this.postServiceClient.emit('user_unFollowed', { followerId, followedId });
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

      return 'user tes private success';
    } catch (error) {
      throw new RpcException({
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }
}
