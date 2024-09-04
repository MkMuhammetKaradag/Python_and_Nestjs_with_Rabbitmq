import { User, UserDocument, UserRole } from '@app/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { InjectModel } from '@nestjs/mongoose';

import { Model, Types } from 'mongoose';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name, 'post')
    private postUserModel: Model<UserDocument>,
  ) {}
  // A function created to ensure data consistency in the post service when a new user registers in the auth service.
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
    // create user
    const user = new this.postUserModel({
      _id: id,
      firstName,
      lastName,
      email,
      roles,
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
}
