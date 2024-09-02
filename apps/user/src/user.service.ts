import {
  FollowRequest,
  FollowRequestDocument,
  FollowRequestStatus,
  User,
  UserDocument,
} from '@app/shared';
import {
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { GraphQLError } from 'graphql';
import { Model, Types } from 'mongoose';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name, 'user') private userModel: Model<UserDocument>,
    @InjectModel(FollowRequest.name, 'user')
    private followRequestModel: Model<FollowRequestDocument>,
  ) {}

  async followUser(currentUserId: string, targetUserId: string) {
    const currentUser = await this.userModel.findById(currentUserId);
    const targetUser = await this.userModel.findById(targetUserId);

    if (!currentUser || !targetUser) {
      throw new RpcException({
        message: 'User Notfound',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    const targetUserObjectId = new Types.ObjectId(targetUserId);
    const existingRequest = currentUser.following.includes(targetUserObjectId);
    if (existingRequest) {
      throw new RpcException({
        message: 'You are already following this user',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    if (targetUser.isPrivate) {
      // Kullanıcı zaten takip ediliyorsa veya bekleyen bir istek varsa hata fırlat
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

      // Yeni bir takip isteği oluştur
      const newRequest = new this.followRequestModel({
        from: currentUserId,
        to: targetUserId,
        status: 'pending',
      });
      await newRequest.save();

      return { message: 'Follow request sent' };
    } else {
      // Profil gizli değilse doğrudan takip et
      // const targetUserObjectId = new Types.ObjectId(targetUserId);
      const currentUserObjectId = new Types.ObjectId(currentUserId);

      currentUser.following.push(targetUserObjectId);
      await currentUser.save();

      targetUser.followers.push(currentUserObjectId);
      await targetUser.save();

      return { message: 'User followed successfully' };
    }
  }

  async acceptFollowRequest(currentUserId: string, requestId: string) {
    const request = await this.followRequestModel.findById(requestId);

    if (
      !request ||
      request.to.toString() !== currentUserId ||
      request.status !== 'pending'
    ) {
      throw new RpcException({
        message: 'Invalid follow request',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    request.status = FollowRequestStatus.ACCEPTED;
    await request.save();

    const currentUser = await this.userModel.findById(currentUserId);
    const follower = await this.userModel.findById(request.from);

    currentUser.followers.push(request.from);
    await currentUser.save();
    const currenUserObjectId = new Types.ObjectId(currentUserId);
    follower.following.push(currenUserObjectId);
    await follower.save();

    return { message: 'Follow request accepted' };
  }

  async rejectFollowRequest(currentUserId: string, requestId: string) {
    const request = await this.followRequestModel.findById(requestId);

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

    request.status = FollowRequestStatus.REJECTED;
    await request.save();

    return { message: 'Follow request rejected' };
  }

  async getFollowRequests(currentUserId: string) {
    return this.followRequestModel
      .find({ to: currentUserId, status: 'pending' })
      .populate('from', 'firstName lastName profilePhoto');
  }
}
