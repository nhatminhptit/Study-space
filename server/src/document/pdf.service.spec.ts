import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PdfService } from './pdf.service.js';
import { buildPdf } from './test-pdf.js';

describe('PdfService', () => {
  const service = new PdfService();

  it('extracts text and page count from a pdf', async () => {
    const pdf = buildPdf([
      'Chapter 3 - Derivatives and their rules',
      'The derivative of sin x is cos x',
    ]);

    const result = await service.extractText(pdf, 'chuong-3.pdf');

    expect(result.numPages).toBe(2);
    expect(result.text).toContain('Chapter 3 - Derivatives');
    expect(result.text).toContain('derivative of sin x is cos x');
    expect(result.charCount).toBe(result.text.length);
    expect(result.title).toBe('chuong-3');
  });

  it('uses the pdf metadata title when present', async () => {
    const pdf = buildPdf(['Some long enough text for the test'], 'Calculus');

    const result = await service.extractText(pdf, 'file.pdf');

    expect(result.title).toBe('Calculus');
  });

  it('throws 422 when the pdf has no text', async () => {
    const pdf = buildPdf(['']);

    await expect(service.extractText(pdf, 'scan.pdf')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('throws 400 when the file is not a valid pdf', async () => {
    const fake = Buffer.from('this is not a pdf at all');

    await expect(service.extractText(fake, 'fake.pdf')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('cleans extra blank lines and trailing spaces', () => {
    expect(service.cleanText('a  \r\n\r\n\r\n\nb\t\n')).toBe('a\n\nb');
  });

  it('falls back to a default title', () => {
    expect(service.pickTitle(undefined, '.pdf')).toBe('Tài liệu không tên');
  });
});
