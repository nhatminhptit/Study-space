import { describe, expect, it } from 'vitest'
import { MAX_PDF_SIZE, validatePdf } from './documents'

function fakeFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('validatePdf', () => {
  it('accepts a normal pdf', () => {
    expect(validatePdf(fakeFile('bai-giang.pdf', 'application/pdf', 1000))).toBeNull()
  })

  it('accepts .pdf name even without mime type', () => {
    expect(validatePdf(fakeFile('Chương 3.PDF', '', 1000))).toBeNull()
  })

  it('rejects other file types', () => {
    expect(validatePdf(fakeFile('note.docx', 'application/msword', 1000))).toMatch(/PDF/)
  })

  it('rejects files over 10 MB and empty files', () => {
    expect(validatePdf(fakeFile('big.pdf', 'application/pdf', MAX_PDF_SIZE + 1))).toMatch(/10 MB/)
    expect(validatePdf(fakeFile('empty.pdf', 'application/pdf', 0))).toBe('File rỗng')
  })
})
