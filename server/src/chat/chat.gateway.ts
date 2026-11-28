import { HttpException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
import { ChatService } from './chat.service.js';
import { PresenceStore, type OnlineUser } from './presence.store.js';
import { resolveSocketUser } from './socket-user.js';

interface RoomPayload {
  roomId: number;
}

interface SendMessagePayload {
  roomId: number;
  content: string;
  clientId?: string;
}

type Ack<T> = ({ ok: true } & T) | { ok: false; error: string };

function errorText(err: unknown): string {
  if (err instanceof HttpException) return err.message;
  return 'Có lỗi xảy ra, thử lại sau';
}

/*
 * Chat phong + trang thai online.
 * C -> S: presence:join, presence:leave, chat:send (co ack)
 * S -> C: presence:users (ca phong), chat:message (ca phong, ke ca nguoi gui)
 */
@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly presence = new PresenceStore();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwt: JwtService,
  ) {}

  private getRoomKey(roomId: number): string {
    return `room:${roomId}`;
  }

  private getUser(client: Socket): Promise<OnlineUser | null> {
    return resolveSocketUser(client, this.jwt, (id) =>
      this.chatService.getUserName(id),
    );
  }

  private broadcastUsers(roomId: number): void {
    this.server.to(this.getRoomKey(roomId)).emit('presence:users', {
      roomId,
      users: this.presence.list(roomId),
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    const user = await this.getUser(client);
    if (!user) this.logger.warn(`Socket ${client.id} chua dang nhap`);
  }

  handleDisconnect(client: Socket): void {
    for (const roomId of this.presence.roomsOf(client.id)) {
      if (this.presence.remove(roomId, client.id) !== null) {
        this.broadcastUsers(roomId);
      }
    }
  }

  @SubscribeMessage('presence:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomPayload,
  ): Promise<Ack<{ users: OnlineUser[] }>> {
    const roomId = Number(payload?.roomId);
    if (!Number.isInteger(roomId)) {
      return { ok: false, error: 'Thiếu mã phòng' };
    }

    const user = await this.getUser(client);
    if (!user) return { ok: false, error: 'Bạn cần đăng nhập lại' };

    try {
      await this.chatService.assertMember(roomId, user.userId);
    } catch (err) {
      return { ok: false, error: errorText(err) };
    }

    await client.join(this.getRoomKey(roomId));
    this.presence.add(roomId, client.id, user);
    this.broadcastUsers(roomId);
    return { ok: true, users: this.presence.list(roomId) };
  }

  @SubscribeMessage('presence:leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomPayload,
  ): void {
    const roomId = Number(payload?.roomId);
    if (!Number.isInteger(roomId)) return;

    // khong roi socket room 'room:<id>' vi cac tinh nang khac (bang trang, nhac) van dung
    if (this.presence.remove(roomId, client.id) !== null) {
      this.broadcastUsers(roomId);
    }
  }

  @SubscribeMessage('chat:send')
  async handleSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessagePayload,
  ): Promise<Ack<{ message: unknown }>> {
    const roomId = Number(payload?.roomId);
    if (!Number.isInteger(roomId)) {
      return { ok: false, error: 'Thiếu mã phòng' };
    }

    const user = await this.getUser(client);
    if (!user) return { ok: false, error: 'Bạn cần đăng nhập lại' };

    try {
      const saved = await this.chatService.createMessage(
        roomId,
        user.userId,
        payload?.content,
      );
      const clientId =
        typeof payload?.clientId === 'string'
          ? payload.clientId.slice(0, 64)
          : undefined;
      const message = { ...saved, clientId };
      this.server.to(this.getRoomKey(roomId)).emit('chat:message', message);
      return { ok: true, message };
    } catch (err) {
      if (!(err instanceof HttpException)) {
        this.logger.error('Luu tin nhan that bai', err as Error);
      }
      return { ok: false, error: errorText(err) };
    }
  }
}
