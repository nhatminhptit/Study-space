import { Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway.js';

@Module({
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule {}
