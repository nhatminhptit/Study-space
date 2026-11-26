import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService, HISTORY_LIMIT } from './chat.service.js';

interface AuthRequest {
  user: { userId: number };
}

@Controller('rooms')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // GET /rooms/:id/messages?limit=50 -> lich su chat (cu -> moi)
  @Get(':id/messages')
  getMessages(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) roomId: number,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getHistory(
      roomId,
      Number(req.user.userId),
      limit ? Number(limit) : HISTORY_LIMIT,
    );
  }
}
