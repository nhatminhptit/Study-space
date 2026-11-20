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
import { PdfService } from './pdf.service.js';
import {
  hasPdfSignature,
  PDF_FIELD_NAME,
  pdfUploadOptions,
} from './pdf-upload.options.js';
import { UploadErrorFilter } from './upload-error.filter.js';

@Controller('documents')
@UseGuards(AuthGuard('jwt'))
export class DocumentController {
  constructor(private readonly pdfService: PdfService) {}

  // POST /documents/extract (multipart/form-data, field "file")
  @Post('extract')
  @UseFilters(UploadErrorFilter)
  @UseInterceptors(FileInterceptor(PDF_FIELD_NAME, pdfUploadOptions))
  async extract(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file PDF (field "file")');
    }
    if (!hasPdfSignature(file.buffer)) {
      throw new BadRequestException('File không phải PDF hợp lệ');
    }

    // Multer decodes the name as latin1, convert back so Vietnamese names work
    const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const pdf = await this.pdfService.extractText(file.buffer, fileName);

    return { fileName, size: file.size, ...pdf };
  }
}
