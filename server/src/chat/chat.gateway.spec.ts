import { ForbiddenException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { vi } from 'vitest';
import { ChatGateway } from './chat.gateway.js';
import type { ChatService } from './chat.service.js';
import { readToken } from './socket-user.js';

function createSocket(id: string, token?: string) {
  return {
    id,
    data: {},
    handshake: { auth: token ? { token } : {}, headers: {} },
    join: vi.fn().mockResolvedValue(undefined),
  } as unknown as Socket & { join: ReturnType<typeof vi.fn> };
}

function setup() {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  const chatService = {
    getUserName: vi.fn((id: number) =>
      Promise.resolve(({ 1: 'Sơn', 2: 'An' } as Record<number, string>)[id]),
    ),
    assertMember: vi.fn().mockResolvedValue(undefined),
    createMessage: vi.fn((roomId: number, userId: number, content: string) =>
      Promise.resolve({ id: 7, roomId, userId, content: content.trim() }),
    ),
  };
  const jwt = {
    verifyAsync: vi.fn((token: string) =>
      token.startsWith('ok-')
        ? Promise.resolve({ sub: Number(token.slice(3)) })
        : Promise.reject(new Error('invalid')),
    ),
  };
  const gateway = new ChatGateway(
    chatService as unknown as ChatService,
    jwt as unknown as JwtService,
  );
  gateway.server = { to } as unknown as Server;
  return { gateway, chatService, to, emit };
}

describe('readToken', () => {
  it('reads token from auth or bearer header', () => {
    expect(readToken(createSocket('a', 'abc'))).toBe('abc');
    const socket = createSocket('b');
    socket.handshake.headers.authorization = 'Bearer xyz';
    expect(readToken(socket)).toBe('xyz');
    expect(readToken(createSocket('c'))).toBeNull();
  });
});

describe('ChatGateway', () => {
  it('joins room and broadcasts online users once per user', async () => {
    const { gateway, to, emit } = setup();
    const tab1 = createSocket('s1', 'ok-1');
    const tab2 = createSocket('s2', 'ok-1');
    const other = createSocket('s3', 'ok-2');

    await gateway.handleJoin(tab1, { roomId: 3 });
    await gateway.handleJoin(tab2, { roomId: 3 });
    const res = await gateway.handleJoin(other, { roomId: 3 });

    expect(tab1.join).toHaveBeenCalledWith('room:3');
    expect(to).toHaveBeenCalledWith('room:3');
    expect(res).toEqual({
      ok: true,
      users: [
        { userId: 2, name: 'An' },
        { userId: 1, name: 'Sơn' },
      ],
    });
    expect(emit).toHaveBeenLastCalledWith('presence:users', {
      roomId: 3,
      users: [
        { userId: 2, name: 'An' },
        { userId: 1, name: 'Sơn' },
      ],
    });

    // dong 1 tab: van online, khong phat lai
    emit.mockClear();
    gateway.handleDisconnect(tab1);
    expect(emit).not.toHaveBeenCalled();

    // dong tab cuoi: phat danh sach moi
    gateway.handleDisconnect(tab2);
    expect(emit).toHaveBeenCalledWith('presence:users', {
      roomId: 3,
      users: [{ userId: 2, name: 'An' }],
    });
  });

  it('rejects sockets without a valid token', async () => {
    const { gateway, chatService } = setup();
    const res = await gateway.handleJoin(createSocket('s1', 'bad'), {
      roomId: 3,
    });
    expect(res).toEqual({ ok: false, error: 'Bạn cần đăng nhập lại' });
    expect(chatService.assertMember).not.toHaveBeenCalled();
  });

  it('rejects users that are not room members', async () => {
    const { gateway, chatService } = setup();
    chatService.assertMember.mockRejectedValue(
      new ForbiddenException('Bạn không phải thành viên phòng này'),
    );
    const socket = createSocket('s1', 'ok-1');
    const res = await gateway.handleJoin(socket, { roomId: 3 });
    expect(res).toEqual({
      ok: false,
      error: 'Bạn không phải thành viên phòng này',
    });
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('saves message and broadcasts it with clientId', async () => {
    const { gateway, chatService, to, emit } = setup();
    const res = await gateway.handleSend(createSocket('s1', 'ok-1'), {
      roomId: 3,
      content: ' chào ',
      clientId: 'tmp-1',
    });

    expect(chatService.createMessage).toHaveBeenCalledWith(3, 1, ' chào ');
    expect(to).toHaveBeenCalledWith('room:3');
    const message = {
      id: 7,
      roomId: 3,
      userId: 1,
      content: 'chào',
      clientId: 'tmp-1',
    };
    expect(emit).toHaveBeenCalledWith('chat:message', message);
    expect(res).toEqual({ ok: true, message });
  });
});
