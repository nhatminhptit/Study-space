import { hasPdfSignature, isPdfFile } from './pdf-upload.options.js';

describe('pdf upload options', () => {
  it('accepts pdf mime type with .pdf extension', () => {
    expect(
      isPdfFile({ mimetype: 'application/pdf', originalname: 'Bai-1.PDF' }),
    ).toBe(true);
  });

  it('rejects other file types', () => {
    expect(isPdfFile({ mimetype: 'image/png', originalname: 'a.png' })).toBe(
      false,
    );
    expect(
      isPdfFile({ mimetype: 'application/pdf', originalname: 'a.docx' }),
    ).toBe(false);
  });

  it('checks the pdf signature', () => {
    expect(hasPdfSignature(Buffer.from('%PDF-1.4\n...'))).toBe(true);
    expect(hasPdfSignature(Buffer.from('PK\u0003\u0004'))).toBe(false);
  });
});
