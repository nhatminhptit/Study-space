import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller.js';
import { PdfService } from './pdf.service.js';

@Module({
  controllers: [DocumentController],
  providers: [PdfService],
  exports: [PdfService],
})
export class DocumentModule {}
