import {
  Chat,
  ChatDocument,
  Message,
  MessageDocument,
  User,
  UserDocument,
} from '@app/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(User.name, 'user') private userModel: Model<UserDocument>,
    @InjectModel(Chat.name, 'user') private chatModel: Model<ChatDocument>,
    @InjectModel(Message.name, 'user')
    private messsageModel: Model<MessageDocument>,
  ) {}

  async createChat(participantIds: string[]): Promise<Chat> {
    if (participantIds.length < 2) {
      throw new RpcException({
        message: 'A chat must have at least 2 participants',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    if (participantIds.length === 2) {
      // İki kişi arasındaki chat için, mevcut bir chat var mı kontrol et
      const existingChat = await this.chatModel.findOne({
        participants: { $all: participantIds, $size: 2 },
      });

      if (existingChat) {
        return existingChat;
      }
    }

    
    const newChat = new this.chatModel({
      participants: participantIds,
      messages: [],
      isGroupChat: participantIds.length > 2,
    });
    await newChat.save();

   
    await this.userModel.updateMany(
      { _id: { $in: participantIds } },
      { $push: { chats: newChat._id } },
    );

    return newChat;
  }

  async getChatById(chatId: string): Promise<Chat> {
    return this.chatModel.findById(chatId)
      .populate('participants')
      .populate({
        path: 'messages',
        populate: { path: 'sender' }
      })
      .exec();
  }
}
