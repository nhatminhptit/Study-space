import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

interface RoomPayload {
  roomId: number;
}

interface WhiteboardUpdatePayload {
  roomId: number;
  canvasJson: Record<string, unknown>;
}

export interface MusicState {
  videoId: string;
  title: string;
  isPlaying: boolean;
  currentTime: number;
  updatedAt: number;
  updatedBy?: string;
}

interface MusicSyncPayload {
  roomId: number;
  videoId: string;
  title?: string;
  isPlaying: boolean;
  currentTime: number;
  updatedBy?: string;
}

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  maxHttpBufferSize: 5e6,
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SocketGateway.name);
  private readonly boardStates = new Map<string, Record<string, unknown>>();
  private readonly musicStates = new Map<string, MusicState>();
  private readonly clientRooms = new Map<string, Set<number>>();

  private getRoomKey(roomId: number): string {
    return `room:${roomId}`;
  }

  private getLiveMusicState(state: MusicState): MusicState {
    if (!state.isPlaying) return state;
    const elapsedSeconds = Math.max(0, (Date.now() - state.updatedAt) / 1000);
    return {
      ...state,
      currentTime: state.currentTime + elapsedSeconds,
      updatedAt: Date.now(),
    };
  }

  private async broadcastPeerCount(roomId: number): Promise<void> {
    const roomKey = this.getRoomKey(roomId);
    const sockets = await this.server.in(roomKey).fetchSockets();
    this.server.to(roomKey).emit('room:peers', {
      roomId,
      count: sockets.length,
    });
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const joinedRooms = this.clientRooms.get(client.id);
    this.clientRooms.delete(client.id);

    if (joinedRooms) {
      for (const roomId of joinedRooms) {
        await this.broadcastPeerCount(roomId);
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomPayload,
  ): Promise<void> {
    const roomId = Number(payload?.roomId);
    if (!Number.isFinite(roomId)) return;

    const roomKey = this.getRoomKey(roomId);
    await client.join(roomKey);

    let rooms = this.clientRooms.get(client.id);
    if (!rooms) {
      rooms = new Set<number>();
      this.clientRooms.set(client.id, rooms);
    }
    rooms.add(roomId);

    const existingBoard = this.boardStates.get(roomKey);
    if (existingBoard) {
      client.emit('whiteboard:state', {
        roomId,
        canvasJson: existingBoard,
      });
    }

    const existingMusic = this.musicStates.get(roomKey);
    if (existingMusic) {
      client.emit('music:state', {
        roomId,
        state: this.getLiveMusicState(existingMusic),
      });
    }

    await this.broadcastPeerCount(roomId);
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomPayload,
  ): Promise<void> {
    const roomId = Number(payload?.roomId);
    if (!Number.isFinite(roomId)) return;

    const roomKey = this.getRoomKey(roomId);
    await client.leave(roomKey);
    this.clientRooms.get(client.id)?.delete(roomId);

    await this.broadcastPeerCount(roomId);
  }

  @SubscribeMessage('whiteboard:update')
  handleWhiteboardUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WhiteboardUpdatePayload,
  ): void {
    const roomId = Number(payload?.roomId);
    if (!Number.isFinite(roomId) || !payload?.canvasJson) return;

    const roomKey = this.getRoomKey(roomId);
    this.boardStates.set(roomKey, payload.canvasJson);

    client.to(roomKey).emit('whiteboard:update', {
      roomId,
      canvasJson: payload.canvasJson,
    });
  }

  @SubscribeMessage('whiteboard:clear')
  handleWhiteboardClear(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomPayload,
  ): void {
    const roomId = Number(payload?.roomId);
    if (!Number.isFinite(roomId)) return;

    const roomKey = this.getRoomKey(roomId);
    this.boardStates.delete(roomKey);

    client.to(roomKey).emit('whiteboard:clear', { roomId });
  }

  @SubscribeMessage('music:get-state')
  handleGetMusicState(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomPayload,
  ): void {
    const roomId = Number(payload?.roomId);
    if (!Number.isFinite(roomId)) return;

    const existingMusic = this.musicStates.get(this.getRoomKey(roomId));
    if (!existingMusic) return;

    client.emit('music:state', {
      roomId,
      state: this.getLiveMusicState(existingMusic),
    });
  }

  @SubscribeMessage('music:sync')
  handleMusicSync(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MusicSyncPayload,
  ): void {
    const roomId = Number(payload?.roomId);
    const videoId = payload?.videoId?.trim();
    if (!Number.isFinite(roomId) || !videoId) return;

    const roomKey = this.getRoomKey(roomId);
    const nextState: MusicState = {
      videoId,
      title: payload.title?.trim() || 'Nhạc học tập',
      isPlaying: Boolean(payload.isPlaying),
      currentTime: Math.max(0, Number(payload.currentTime) || 0),
      updatedAt: Date.now(),
      updatedBy: payload.updatedBy?.trim(),
    };

    this.musicStates.set(roomKey, nextState);
    client.to(roomKey).emit('music:state', {
      roomId,
      state: nextState,
    });
  }
}
