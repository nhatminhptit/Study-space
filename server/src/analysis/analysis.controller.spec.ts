import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import request from 'supertest';
import { AiService } from '../ai/ai.service.js';
import { buildPdf } from '../document/test-pdf.js';
import { AnalysisModule } from './analysis.module.js';

describe('AnalysisController (POST /documents/analyze)', () => {
  let app: INestApplication;
  const aiService = {
    generateMindmap: vi.fn(),
    askTutor: vi.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AnalysisModule],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideProvider(AiService)
      .useValue(aiService)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    aiService.generateMindmap.mockResolvedValue({
      label: 'Đạo hàm',
      children: [{ label: 'Quy tắc tính' }],
    });
    aiService.askTutor.mockResolvedValue({ answer: 'Tóm tắt.' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns summary and mindmap json for a pdf', async () => {
    const pdf = buildPdf(['Chapter 3 - Derivatives and their rules']);

    const res = await request(app.getHttpServer())
      .post('/documents/analyze')
      .attach('file', pdf, {
        filename: 'Chương 3.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      fileName: 'Chương 3.pdf',
      title: 'Chương 3',
      numPages: 1,
      truncated: false,
      summary: 'Tóm tắt.',
      mindmap: { label: 'Đạo hàm', children: [{ label: 'Quy tắc tính' }] },
    });
    expect(aiService.generateMindmap.mock.lastCall?.[0]).toContain(
      'Derivatives',
    );
  });

  it('returns 400 when no file is sent', async () => {
    const res = await request(app.getHttpServer()).post('/documents/analyze');

    expect(res.status).toBe(400);
  });

  it('returns 400 for a non pdf file', async () => {
    const res = await request(app.getHttpServer())
      .post('/documents/analyze')
      .attach('file', Buffer.from('hello'), {
        filename: 'note.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
  });

  it('returns 422 when the pdf has no text', async () => {
    const res = await request(app.getHttpServer())
      .post('/documents/analyze')
      .attach('file', buildPdf(['']), {
        filename: 'scan.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(422);
  });

  it('returns 502 when the ai returns no usable mindmap', async () => {
    aiService.generateMindmap.mockResolvedValue({ foo: 'bar' });

    const res = await request(app.getHttpServer())
      .post('/documents/analyze')
      .attach('file', buildPdf(['Some readable text in the pdf']), {
        filename: 'a.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(502);
  });
});
