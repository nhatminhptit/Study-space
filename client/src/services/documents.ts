import { request } from './http'

// cay mindmap backend tra ve (docs/API.md - POST /documents/analyze)
export interface MindmapJson {
  label: string
  note?: string
  children?: MindmapJson[]
}

export interface DocumentAnalysis {
  fileName: string
  title: string
  numPages: number
  charCount: number
  truncated: boolean
  summary: string
  mindmap: MindmapJson
}

// gioi han giong backend (pdf-upload.options.ts)
export const MAX_PDF_SIZE = 10 * 1024 * 1024

// kiem tra som o client de khong phai upload roi moi bao loi
export function validatePdf(file: File): string | null {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  if (!isPdf) return 'Chỉ chấp nhận file PDF (.pdf)'
  if (file.size > MAX_PDF_SIZE) return `File vượt quá ${MAX_PDF_SIZE / 1024 / 1024} MB`
  if (file.size === 0) return 'File rỗng'
  return null
}

// POST /documents/analyze (multipart, field "file") -> tom tat + mindmap JSON
export function analyzePdf(file: File) {
  const form = new FormData()
  form.append('file', file)
  return request<DocumentAnalysis>('/documents/analyze', { method: 'POST', body: form })
}

// thong bao loi theo status backend tra ve
export const ANALYZE_ERRORS: Record<number, string> = {
  413: 'File vượt quá 10 MB',
  422: 'Không đọc được chữ trong PDF (có thể là PDF scan ảnh)',
  502: 'AI đang lỗi hoặc quá tải, vui lòng thử lại sau',
  504: 'AI phản hồi quá lâu, vui lòng thử lại',
}
