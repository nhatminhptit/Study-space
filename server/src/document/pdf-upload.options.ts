import { BadRequestException } from '@nestjs/common';
import type { MulterModuleOptions } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

export const PDF_FIELD_NAME = 'file';
export const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10 MB

const PDF_MIME_TYPES = ['application/pdf', 'application/x-pdf'];

export function isPdfFile(file: { mimetype: string; originalname: string }) {
  return (
    PDF_MIME_TYPES.includes(file.mimetype) && /\.pdf$/i.test(file.originalname)
  );
}

// Real PDF files always start with the "%PDF-" signature
export function hasPdfSignature(buffer: Buffer) {
  return buffer.subarray(0, 5).toString('latin1') === '%PDF-';
}

// Keep the file in memory so pdf-parse can read the buffer directly
export const pdfUploadOptions: MulterModuleOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_PDF_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!isPdfFile(file)) {
      return callback(
        new BadRequestException('Chỉ chấp nhận file PDF (.pdf)'),
        false,
      );
    }
    callback(null, true);
  },
};
