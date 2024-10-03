import {
  Chat,
  ChatDocument,
  LivekitService,
  Message,
  MessageDocument,
  NotificationType,
  PUB_SUB,
  User,
  UserDocument,
} from '@app/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Model, Types } from 'mongoose';
const CREATE_MESSAGE = 'createMessageToChat';
const VIDEO_CALL_STARTED = 'videoCallStarted';
interface IUser {
  _id: Types.ObjectId | string;
  userName: string;
  // diğer kullanıcı alanları...
}

interface IMessage {
  _id: Types.ObjectId | string;
  content: string;
  sender: IUser | Types.ObjectId | string;
  // diğer mesaj alanları...
}

interface IChat {
  _id: Types.ObjectId | string;
  participants: Array<IUser | Types.ObjectId | string>;
  messages: Array<IMessage | Types.ObjectId | string>;
  createdAt: Date;
  updatedAt: Date;
}

// type ChatDocument = Document & IChat;
@Injectable()
export class ChatService {
  constructor(
    @InjectModel(User.name, 'user') private userModel: Model<UserDocument>,
    @InjectModel(Chat.name, 'user') private chatModel: Model<ChatDocument>,
    @InjectModel(Message.name, 'user')
    private messageModel: Model<MessageDocument>,
    @Inject('POST_SERVICE')
    private readonly postServiceClient: ClientProxy,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
    private readonly liveKitService: LivekitService,
  ) {}

  async createChat(participantIds: string[]): Promise<Chat> {
    const participantObjectIds = participantIds.map(
      (participantId) => new Types.ObjectId(participantId),
    );
    if (participantObjectIds.length < 2) {
      throw new RpcException({
        message: 'A chat must have at least 2 participants',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    if (participantObjectIds.length === 2) {
      // İki kişi arasındaki chat için, mevcut bir chat var mı kontrol et
      const existingChat = await this.chatModel.findOne({
        participants: { $all: participantObjectIds, $size: 2 },
      });

      if (existingChat) {
        return existingChat;
      }
    }

    const newChat = new this.chatModel({
      participants: participantObjectIds,
      messages: [],
      isGroupChat: participantObjectIds.length > 2,
    });
    await newChat.save();

    await this.userModel.updateMany(
      { _id: { $in: participantObjectIds } },
      { $push: { chats: newChat._id } },
    );

    const roomName = `chat-${newChat._id}`;
    try {
      await this.liveKitService.createRoom(roomName);
    } catch (error) {
      throw new RpcException({
        message: 'Livekit oluşturulurken bir hata oldu',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }

    return newChat;
  }

  async joinVideoRoom(joinVideoRoom: { chatId: string; userId: string }) {
    const { chatId, userId } = joinVideoRoom;

    const chat = await this.chatModel.findOne({
      _id: chatId,
      participants: { $in: new Types.ObjectId(userId) },
    });
    if (!chat) {
      throw new RpcException({
        message: 'Chat not found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    const roomName = `chat-${chat._id}`;
    const token = this.liveKitService.generateToken(roomName, userId);
    return token;
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
      sender: new Types.ObjectId(senderId),
      chat: new Types.ObjectId(chatId),
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

    this.notificationEmitEvent('create_notification', {
      senderId: user._id,
      recipientId: chat.participants.find(
        (userId) => userId.toString() != senderId,
      ),
      type: NotificationType.DIRECT_MESSAGE,
      content: {
        _id: user._id,
      },
      contentType: 'User',
      message: `${user.userName} messaj attı`,
    });
    return newMessage;
  }

  async getChatMessages(
    chatId: string,
    page: number = 1,
    pageSize: number = 10,
    extraPassValue: number = 0,
  ) {
    const skip = (page - 1) * pageSize + extraPassValue;
    console.log(chatId);
    const chatMessages = await this.messageModel
      .find({
        chat: new Types.ObjectId(chatId),
      })
      .populate({
        path: 'sender',
        select: 'userName profilePhoto _id',
        model: 'User',
      })
      .sort({ createdAt: -1 }) // En yeni mesajları önce getirir
      .skip(skip)
      .limit(pageSize);

    const totalMessages = await this.messageModel.countDocuments({
      chat: new Types.ObjectId(chatId),
    });

    const pagination = {
      messages: chatMessages,
      currentPage: page,
      totalPages: Math.ceil(totalMessages / pageSize),
      totalMessages,
    };

    return pagination;
  }
  async getChats(currentUserId: string) {
    const chats = await this.chatModel
      .aggregate([
        {
          $match: {
            participants: new Types.ObjectId(currentUserId),
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'participants',
            foreignField: '_id',
            as: 'participants',
          },
        },
        {
          $lookup: {
            from: 'messages',
            localField: 'messages',
            foreignField: '_id',
            pipeline: [
              // { $match: { $expr: { $eq: ['$chatId', '$$chatId'] } } },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
              {
                $lookup: {
                  from: 'users',
                  localField: 'sender',
                  foreignField: '_id',
                  as: 'sender',
                },
              },
              { $unwind: '$sender' },
              {
                $project: {
                  content: 1,
                  createdAt: 1,
                  'sender._id': 1,
                },
              },
            ],
            as: 'lastMessage',
          },
        },
        {
          $project: {
            participants: {
              $filter: {
                input: '$participants',
                as: 'participant',
                cond: {
                  $ne: ['$$participant._id', new Types.ObjectId(currentUserId)],
                },
              },
            },
            lastMessage: { $arrayElemAt: ['$lastMessage', 0] },
          },
        },
        {
          $project: {
            'participants._id': 1,
            'participants.status': 1,
            'participants.userName': 1,
            'participants.profilePhoto': 1,
            lastMessage: 1,
          },
        },
      ])
      .exec();

    return chats;
  }

  async startVideoCall(currentUserId: string, chatId: string) {
    const chat = await this.chatModel.findById(chatId);
    const user = await this.userModel.findById(currentUserId);
    if (!chat || !user) {
      throw new RpcException({
        message: 'Chat or user   is not found',
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    const participants = chat.participants.filter(
      (participant) => participant._id.toString() !== currentUserId,
    );

    this.pubSub.publish(VIDEO_CALL_STARTED, {
      videoCallStarted: {
        participants: participants,
        chatId: chat._id,
        userName: user.userName,
      },
    });

    return true;
  }

  private notificationEmitEvent(cmd: string, payload: any) {
    this.postServiceClient.emit(cmd, payload);
  }
}
