import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import request from 'supertest';
import { DocumentModule } from './document.module.js';
import { buildPdf } from './test-pdf.js';

describe('DocumentController (POST /documents/extract)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DocumentModule],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns extracted text for a pdf', async () => {
    const pdf = buildPdf(['Chapter 3 - Derivatives and their rules']);

    const res = await request(app.getHttpServer())
      .post('/documents/extract')
      .attach('file', pdf, {
        filename: 'Chương 3.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(201);
    expect(res.body.fileName).toBe('Chương 3.pdf');
    expect(res.body.title).toBe('Chương 3');
    expect(res.body.numPages).toBe(1);
    expect(res.body.size).toBe(pdf.length);
    expect(res.body.text).toContain('Derivatives');
  });

  it('returns 400 when no file is sent', async () => {
    const res = await request(app.getHttpServer()).post('/documents/extract');

    expect(res.status).toBe(400);
  });

  it('returns 400 for a non pdf file', async () => {
    const res = await request(app.getHttpServer())
      .post('/documents/extract')
      .attach('file', Buffer.from('hello'), {
        filename: 'note.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Chỉ chấp nhận file PDF (.pdf)');
  });

  it('returns 400 when the content is not really a pdf', async () => {
    const res = await request(app.getHttpServer())
      .post('/documents/extract')
      .attach('file', Buffer.from('fake content'), {
        filename: 'fake.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(400);
  });

  it('returns 422 when the pdf has no text', async () => {
    const res = await request(app.getHttpServer())
      .post('/documents/extract')
      .attach('file', buildPdf(['']), {
        filename: 'scan.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(422);
  });

  it('returns 413 when the file is larger than 10 MB', async () => {
    const big = Buffer.concat([
      Buffer.from('%PDF-1.4\n'),
      Buffer.alloc(10 * 1024 * 1024 + 1),
    ]);

    const res = await request(app.getHttpServer())
      .post('/documents/extract')
      .attach('file', big, {
        filename: 'big.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(413);
    expect(res.body.message).toBe('File vượt quá 10 MB');
  });
});
