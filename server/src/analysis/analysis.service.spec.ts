import {
  BadGatewayException,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { AiService } from '../ai/ai.service.js';
import type { PdfService } from '../document/pdf.service.js';
import { AnalysisService, MAX_AI_TEXT_LENGTH } from './analysis.service.js';

const extracted = {
  title: 'Chương 3 - Đạo hàm',
  numPages: 2,
  text: 'Đạo hàm là giới hạn của tỉ số gia số.',
  charCount: 37,
};

function setup() {
  const pdfService = { extractText: vi.fn().mockResolvedValue(extracted) };
  const aiService = {
    generateMindmap: vi.fn().mockResolvedValue({
      label: 'Đạo hàm',
      children: [{ label: 'Định nghĩa' }],
    }),
    askTutor: vi.fn().mockResolvedValue({ answer: '  Tóm tắt ngắn.  ' }),
  };
  const service = new AnalysisService(
    pdfService as unknown as PdfService,
    aiService as unknown as AiService,
  );
  return { service, pdfService, aiService };
}

describe('AnalysisService', () => {
  it('returns pdf info, summary and cleaned mindmap', async () => {
    const { service, pdfService } = setup();
    const buffer = Buffer.from('%PDF-');

    const result = await service.analyzePdf(buffer, 'Chương 3.pdf');

    expect(pdfService.extractText).toHaveBeenCalledWith(buffer, 'Chương 3.pdf');
    expect(result).toEqual({
      fileName: 'Chương 3.pdf',
      title: 'Chương 3 - Đạo hàm',
      numPages: 2,
      charCount: 37,
      truncated: false,
      summary: 'Tóm tắt ngắn.',
      mindmap: { label: 'Đạo hàm', children: [{ label: 'Định nghĩa' }] },
    });
  });

  it('sends the title and text to the ai', async () => {
    const { service, aiService } = setup();

    await service.analyzePdf(Buffer.from(''), 'a.pdf');

    const prompt = aiService.generateMindmap.mock.calls[0][0] as string;
    expect(prompt).toContain(extracted.title);
    expect(prompt).toContain(extracted.text);
    expect(aiService.askTutor.mock.calls[0][1]).toBe(extracted.text);
  });

  it('cuts very long text before calling the ai', async () => {
    const { service, pdfService, aiService } = setup();
    const text = 'a'.repeat(MAX_AI_TEXT_LENGTH + 500);
    pdfService.extractText.mockResolvedValue({ ...extracted, text });

    const result = await service.analyzePdf(Buffer.from(''), 'a.pdf');

    expect(result.truncated).toBe(true);
    expect(aiService.askTutor.mock.calls[0][1]).toHaveLength(
      MAX_AI_TEXT_LENGTH,
    );
  });

  it('keeps pdf errors as they are', async () => {
    const { service, pdfService, aiService } = setup();
    pdfService.extractText.mockRejectedValue(
      new UnprocessableEntityException('Không đọc được chữ trong PDF'),
    );

    await expect(
      service.analyzePdf(Buffer.from(''), 'a.pdf'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(aiService.generateMindmap).not.toHaveBeenCalled();
  });

  it('returns 502 when the ai call fails', async () => {
    const { service, aiService } = setup();
    aiService.generateMindmap.mockRejectedValue(
      new InternalServerErrorException('Không thể gọi Google Gemini API'),
    );

    const error = await service
      .analyzePdf(Buffer.from(''), 'a.pdf')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadGatewayException);
    expect((error as Error).message).toBe('Không thể gọi Google Gemini API');
  });

  it('returns 502 when the ai json is broken or empty', async () => {
    const { service, aiService } = setup();

    aiService.generateMindmap.mockRejectedValueOnce(new SyntaxError('bad'));
    await expect(
      service.analyzePdf(Buffer.from(''), 'a.pdf'),
    ).rejects.toBeInstanceOf(BadGatewayException);

    aiService.generateMindmap.mockResolvedValueOnce({ children: [] });
    await expect(
      service.analyzePdf(Buffer.from(''), 'a.pdf'),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('still returns the mindmap when the summary fails', async () => {
    const { service, aiService } = setup();
    aiService.askTutor.mockRejectedValue(new Error('quota'));

    const result = await service.analyzePdf(Buffer.from(''), 'a.pdf');

    expect(result.summary).toBe('');
    expect(result.mindmap.label).toBe('Đạo hàm');
  });
});
