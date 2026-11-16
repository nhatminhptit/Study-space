import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class RoomService {
  constructor(private prisma: PrismaService) {}

  async createRoom(userId: number, name: string) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    return this.prisma.room.create({
      data: {
        name,
        code,
        members: {
          connect: { id: userId },
        },
      },
      include: {
        members: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async getAllRooms() {
    return this.prisma.room.findMany({
      include: {
        _count: {
          select: { members: true },
        },
      },
    });
  }

  async joinRoom(userId: number, code: string) {
    const room = await this.prisma.room.findUnique({
      where: { code },
      include: { members: true },
    });

    if (!room) {
      throw new NotFoundException();
    }

    const isMember = room.members.some((member) => member.id === userId);
    if (isMember) {
      throw new BadRequestException();
    }

    return this.prisma.room.update({
      where: { id: room.id },
      data: {
        members: {
          connect: { id: userId },
        },
      },
      include: {
        members: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}
