import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export const MAX_MESSAGE_LENGTH = 2000;
export const HISTORY_LIMIT = 50;

const messageSelect = {
  id: true,
  roomId: true,
  userId: true,
  content: true,
  createdAt: true,
  user: { select: { id: true, name: true } },
} as const;

// chuan hoa noi dung tin nhan; tra ve null neu rong hoac qua dai
export function normalizeContent(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const content = raw.trim();
  if (!content || content.length > MAX_MESSAGE_LENGTH) return null;
  return content;
}

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async isMember(roomId: number, userId: number): Promise<boolean> {
    const count = await this.prisma.room.count({
      where: { id: roomId, members: { some: { id: userId } } },
    });
    return count > 0;
  }

  async assertMember(roomId: number, userId: number): Promise<void> {
    if (!(await this.isMember(roomId, userId))) {
      throw new ForbiddenException('Bạn không phải thành viên phòng này');
    }
  }

  async getUserName(userId: number): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    return user?.name ?? null;
  }

  // lich su chat: lay N tin moi nhat, tra ve theo thu tu cu -> moi
  async getHistory(roomId: number, userId: number, limit = HISTORY_LIMIT) {
    await this.assertMember(roomId, userId);
    const take = Math.min(Math.max(1, Math.floor(limit) || HISTORY_LIMIT), 200);
    const messages = await this.prisma.message.findMany({
      where: { roomId },
      orderBy: { id: 'desc' },
      take,
      select: messageSelect,
    });
    return messages.reverse();
  }

  async createMessage(roomId: number, userId: number, raw: unknown) {
    const content = normalizeContent(raw);
    if (!content) {
      throw new BadRequestException(
        `Tin nhắn phải có từ 1 đến ${MAX_MESSAGE_LENGTH} ký tự`,
      );
    }
    await this.assertMember(roomId, userId);
    return this.prisma.message.create({
      data: { content, roomId, userId },
      select: messageSelect,
    });
  }
}
