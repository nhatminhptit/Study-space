import type { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import type { OnlineUser } from './presence.store.js';

interface TokenPayload {
  sub: number | string;
  email?: string;
}

// lay token tu handshake: auth.token hoac header Authorization: Bearer ...
export function readToken(client: Socket): string | null {
  const fromAuth = (client.handshake.auth as { token?: unknown } | undefined)
    ?.token;
  if (typeof fromAuth === 'string' && fromAuth) return fromAuth;
  const header = client.handshake.headers?.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  return null;
}

/*
 * Xac thuc user cua socket 1 lan, cache promise vao client.data
 * de cac event den som (truoc khi xac thuc xong) van dung chung ket qua.
 */
export function resolveSocketUser(
  client: Socket,
  jwt: JwtService,
  findName: (userId: number) => Promise<string | null>,
): Promise<OnlineUser | null> {
  const data = client.data as { user?: Promise<OnlineUser | null> };
  if (!data.user) {
    data.user = (async () => {
      const token = readToken(client);
      if (!token) return null;
      try {
        const payload = await jwt.verifyAsync<TokenPayload>(token, {
          secret: process.env.JWT_SECRET,
        });
        const userId = Number(payload.sub);
        if (!Number.isInteger(userId)) return null;
        const name = await findName(userId);
        return name ? { userId, name } : null;
      } catch {
        return null;
      }
    })();
  }
  return data.user;
}
