import { Module } from '@nestjs/common';
import { RoomService } from './room.service.js';
import { RoomController } from './room.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Module({
  controllers: [RoomController],
  providers: [RoomService, PrismaService],
})
export class RoomModule {}
