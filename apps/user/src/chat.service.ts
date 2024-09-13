import {
  Chat,
  ChatDocument,
  Message,
  MessageDocument,
  PUB_SUB,
  User,
  UserDocument,
} from '@app/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Model, Types } from 'mongoose';
const CREATE_MESSAGE = 'createMessageToChat';
@Injectable()
export class ChatService {
  constructor(
    @InjectModel(User.name, 'user') private userModel: Model<UserDocument>,
    @InjectModel(Chat.name, 'user') private chatModel: Model<ChatDocument>,
    @InjectModel(Message.name, 'user')
    private messageModel: Model<MessageDocument>,

    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
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
    return this.chatModel
      .findById(chatId)
      .populate('participants')
      .populate({
        path: 'messages',
        populate: { path: 'sender' },
      })
      .exec();
  }

  async addMessageToChat(
    chatId: string,
    senderId: string,
    content: string,
  ): Promise<Message> {
    const chat = await this.chatModel.findById(chatId);
    const user = await this.userModel.findById(senderId);
    if (!chat || !user) {
      throw new RpcException({
        message: 'Chat or user  is not found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    if (!chat.participants.includes(new Types.ObjectId(senderId))) {
      throw new RpcException({
        message: 'User is not a participant of this chat',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const newMessage = new this.messageModel({
      sender: senderId,
      chat: chatId,
      content: content,
    });
    await newMessage.save();

    // Chat'e mesajı ekle
    await this.chatModel.findByIdAndUpdate(chatId, {
      $push: { messages: newMessage._id },
    });

    // Kullanıcının mesajlar listesini güncelle
    // await this.userModel.findByIdAndUpdate(senderId, {
    //   $push: { messages: newMessage._id },
    // });
    this.pubSub.publish(CREATE_MESSAGE, {
      createMessageToChat: {
        _id: newMessage._id,
        content: newMessage.content,
        chatId: chat._id,
        sender: {
          _id: user._id,
          userName: user.userName,
          profilePhoto: user.profilePhoto,
        },
      },
    });
    return newMessage;
  }
}
