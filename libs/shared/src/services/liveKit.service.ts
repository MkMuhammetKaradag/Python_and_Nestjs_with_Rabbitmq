import { Injectable } from '@nestjs/common';

@Injectable()
export class LivekitService {
  private roomService: any;

  constructor() {
    this.initializeRoomService();
  }

  private async initializeRoomService() {
    const LiveKit = await import('livekit-server-sdk');
    this.roomService = new LiveKit.RoomServiceClient(
      process.env.LIVEKIT_URL,
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
    );
  }

  async generateToken(roomName: string, participantName: string) {
    const { AccessToken } = await import('livekit-server-sdk');
    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: participantName,
      },
    );
    token.addGrant({
      roomJoin: true,
      room: roomName,
    });
    return token.toJwt();
  }

  async createRoom(roomName: string) {
    if (!this.roomService) {
      await this.initializeRoomService();
    }
    return this.roomService.createRoom({ name: roomName });
  }
}
