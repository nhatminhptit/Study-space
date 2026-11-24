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
  private readonly clientRooms = new Map<string, Set<number>>();

  private getRoomKey(roomId: number): string {
    return `room:${roomId}`;
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

    const existingState = this.boardStates.get(roomKey);
    if (existingState) {
      client.emit('whiteboard:state', {
        roomId,
        canvasJson: existingState,
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
}
