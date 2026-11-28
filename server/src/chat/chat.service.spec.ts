import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import {
  ChatService,
  MAX_MESSAGE_LENGTH,
  normalizeContent,
} from './chat.service.js';

function createPrisma(isMember = true) {
  return {
    room: { count: vi.fn().mockResolvedValue(isMember ? 1 : 0) },
    user: { findUnique: vi.fn() },
    message: {
      findMany: vi.fn(),
      create: vi.fn((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 10, ...args.data }),
      ),
    },
  };
}

function createService(prisma: ReturnType<typeof createPrisma>) {
  return new ChatService(prisma as unknown as PrismaService);
}

describe('normalizeContent', () => {
  it('trims and validates length', () => {
    expect(normalizeContent('  chào cả nhóm \n')).toBe('chào cả nhóm');
    expect(normalizeContent('   ')).toBeNull();
    expect(normalizeContent(123)).toBeNull();
    expect(normalizeContent('a'.repeat(MAX_MESSAGE_LENGTH))).toHaveLength(
      MAX_MESSAGE_LENGTH,
    );
    expect(normalizeContent('a'.repeat(MAX_MESSAGE_LENGTH + 1))).toBeNull();
  });
});

describe('ChatService', () => {
  it('saves a trimmed message for a room member', async () => {
    const prisma = createPrisma();
    const message = await createService(prisma).createMessage(3, 1, ' hi ');

    expect(prisma.room.count).toHaveBeenCalledWith({
      where: { id: 3, members: { some: { id: 1 } } },
    });
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { content: 'hi', roomId: 3, userId: 1 },
      }),
    );
    expect(message).toMatchObject({ id: 10, content: 'hi' });
  });

  it('rejects empty messages', async () => {
    const prisma = createPrisma();
    await expect(
      createService(prisma).createMessage(3, 1, '  '),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('rejects users outside the room', async () => {
    const prisma = createPrisma(false);
    await expect(
      createService(prisma).createMessage(3, 1, 'hi'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(createService(prisma).getHistory(3, 1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('returns latest history in chronological order', async () => {
    const prisma = createPrisma();
    prisma.message.findMany.mockResolvedValue([
      { id: 3 },
      { id: 2 },
      { id: 1 },
    ]);

    const history = await createService(prisma).getHistory(3, 1, 3);

    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { roomId: 3 },
        orderBy: { id: 'desc' },
        take: 3,
      }),
    );
    expect(history.map((m) => m.id)).toEqual([1, 2, 3]);
  });
});
