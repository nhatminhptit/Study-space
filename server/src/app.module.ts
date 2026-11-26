import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { RoomModule } from './room/room.module.js';
import { DocumentModule } from './document/document.module.js';
import { SocketModule } from './socket/socket.module.js';
import { AiModule } from './ai/ai.module.js';
import { ChatModule } from './chat/chat.module.js';

@Module({
  imports: [
    AuthModule,
    RoomModule,
    DocumentModule,
    SocketModule,
    AiModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
