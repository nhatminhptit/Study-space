import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { RoomModule } from './room/room.module.js';
import { DocumentModule } from './document/document.module.js';
import { SocketModule } from './socket/socket.module.js';

@Module({
  imports: [AuthModule, RoomModule, DocumentModule, SocketModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
