import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PDFParse, PasswordException } from 'pdf-parse';

export type ExtractedPdf = {
  title: string;
  numPages: number;
  text: string;
  charCount: number;
};

// Minimum number of characters for a PDF to count as having real text
// (scanned image PDFs usually return only whitespace or page markers)
const MIN_TEXT_LENGTH = 20;

@Injectable()
export class PdfService {
  async extractText(buffer: Buffer, fileName = ''): Promise<ExtractedPdf> {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });

    try {
      // pdf.js worker does not support parallel calls on one document
      const info = await parser.getInfo();
      const result = await parser.getText({ pageJoiner: '' });

      const text = this.cleanText(result.text);
      if (text.length < MIN_TEXT_LENGTH) {
        throw new UnprocessableEntityException(
          'Không đọc được chữ trong PDF (có thể là PDF scan ảnh)',
        );
      }

      return {
        title: this.pickTitle(info.info?.Title, fileName),
        numPages: result.total,
        text,
        charCount: text.length,
      };
    } catch (error) {
      if (error instanceof UnprocessableEntityException) throw error;
      if (error instanceof PasswordException) {
        throw new BadRequestException('PDF đang được đặt mật khẩu');
      }
      throw new BadRequestException('File PDF bị hỏng hoặc không hợp lệ');
    } finally {
      await parser.destroy();
    }
  }

  // Normalize line endings, trim trailing spaces and collapse blank lines
  cleanText(raw: string): string {
    return raw
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Prefer the PDF metadata title, fall back to the file name without extension
  pickTitle(metaTitle: unknown, fileName: string): string {
    if (typeof metaTitle === 'string' && metaTitle.trim()) {
      return metaTitle.trim();
    }
    const base = fileName.replace(/\.pdf$/i, '').trim();
    return base || 'Tài liệu không tên';
  }
}
