import {
  FollowRequest,
  FollowRequestDocument,
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
      const targetUserObjectId = new Types.ObjectId(targetUserId);
      const currentUserObjectId = new Types.ObjectId(currentUserId);
      if (!currentUser.following.includes(targetUserObjectId)) {
        currentUser.following.push(targetUserObjectId);
        await currentUser.save();

        targetUser.followers.push(currentUserObjectId);
        await targetUser.save();
      }

      return { message: 'User followed successfully' };
    }
  }
}
