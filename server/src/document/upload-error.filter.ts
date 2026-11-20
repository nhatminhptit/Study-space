import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';
import { MAX_PDF_SIZE } from './pdf-upload.options.js';

// Multer throws "File too large" in English, rewrite it for the client
@Catch(PayloadTooLargeException)
export class UploadErrorFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    res.status(413).json({
      statusCode: 413,
      message: `File vượt quá ${MAX_PDF_SIZE / 1024 / 1024} MB`,
      error: 'Payload Too Large',
    });
  }
}
