import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { RoomService } from './room.service.js';
import { AuthGuard } from '@nestjs/passport';

@Controller('rooms')
@UseGuards(AuthGuard('jwt'))
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  async createRoom(@Req() req: any, @Body('name') name: string) {
    return this.roomService.createRoom(req.user.userId, name);
  }

  @Get()
  async getAllRooms() {
    return this.roomService.getAllRooms();
  }

  @Post('join')
  async joinRoom(@Req() req: any, @Body('code') code: string) {
    return this.roomService.joinRoom(req.user.userId, code);
  }
}
