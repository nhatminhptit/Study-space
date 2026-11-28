import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  hasPdfSignature,
  PDF_FIELD_NAME,
  pdfUploadOptions,
} from '../document/pdf-upload.options.js';
import { UploadErrorFilter } from '../document/upload-error.filter.js';
import { AnalysisService } from './analysis.service.js';

@Controller('documents')
@UseGuards(AuthGuard('jwt'))
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  // POST /documents/analyze (multipart/form-data, field "file")
  // -> { fileName, title, numPages, charCount, truncated, summary, mindmap }
  @Post('analyze')
  @UseFilters(UploadErrorFilter)
  @UseInterceptors(FileInterceptor(PDF_FIELD_NAME, pdfUploadOptions))
  analyze(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file PDF (field "file")');
    }
    if (!hasPdfSignature(file.buffer)) {
      throw new BadRequestException('File không phải PDF hợp lệ');
    }

    // Multer decodes the name as latin1, convert back so Vietnamese names work
    const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    return this.analysisService.analyzePdf(file.buffer, fileName);
  }
}
