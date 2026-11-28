import { useEffect, useRef, useState, type DragEvent } from 'react'
import { errorMessage } from '../../services/http'
import { analyzePdf, ANALYZE_ERRORS, validatePdf, type DocumentAnalysis } from '../../services/documents'
import './pdf-analyzer.css'

type Status =
  | { kind: 'idle' }
  | { kind: 'loading'; fileName: string }
  | { kind: 'done'; result: DocumentAnalysis }
  | { kind: 'error'; message: string }

// cac buoc cua luong AI, hien lan luot theo thoi gian cho
const STEPS = ['Tải PDF lên server', 'Đọc chữ trong PDF', 'AI tạo sơ đồ tư duy']

function useElapsedSeconds(running: boolean) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!running) return
    const start = Date.now()
    const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 500)
    return () => {
      window.clearInterval(id)
      setSeconds(0)
    }
  }, [running])
  return seconds
}

/*
 * Luong AI cua T04DEF0: chon / keo tha PDF -> POST /documents/analyze
 * (backend doc PDF + Gemini tra JSON) -> goi onResult de ve mindmap.
 */
export default function PdfAnalyzer({ onResult }: { onResult: (result: DocumentAnalysis) => void }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const requestId = useRef(0)
  const loading = status.kind === 'loading'
  const seconds = useElapsedSeconds(loading)

  // bo qua ket qua tra ve sau khi component da bi go
  useEffect(() => () => void (requestId.current += 1), [])

  async function handleFile(file: File | undefined) {
    if (!file || loading) return
    const invalid = validatePdf(file)
    if (invalid) {
      setStatus({ kind: 'error', message: invalid })
      return
    }

    const id = ++requestId.current
    setStatus({ kind: 'loading', fileName: file.name })
    try {
      const result = await analyzePdf(file)
      if (id !== requestId.current) return
      setStatus({ kind: 'done', result })
      onResult(result)
    } catch (err) {
      if (id !== requestId.current) return
      setStatus({ kind: 'error', message: errorMessage(err, ANALYZE_ERRORS) })
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    void handleFile(e.dataTransfer.files[0])
  }

  // buoc hien tai uoc luong theo thoi gian (upload nhanh, AI lau nhat)
  const step = seconds < 1 ? 0 : seconds < 3 ? 1 : 2

  return (
    <section className="pdf-ai" aria-live="polite">
      <div
        className={`pdf-drop ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          if (!loading) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => {
            void handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <button type="button" className="primary" disabled={loading} onClick={() => inputRef.current?.click()}>
          {loading ? 'Đang phân tích…' : 'Tạo sơ đồ từ PDF'}
        </button>
        <span className="pdf-drop-hint">hoặc kéo thả file PDF vào đây (tối đa 10 MB)</span>
      </div>

      {status.kind === 'loading' && (
        <div className="pdf-progress">
          <p className="pdf-file" title={status.fileName}>
            {status.fileName} · {seconds}s
          </p>
          <ol className="pdf-steps">
            {STEPS.map((label, i) => (
              <li key={label} className={i < step ? 'done' : i === step ? 'active' : ''}>
                {label}
              </li>
            ))}
          </ol>
        </div>
      )}

      {status.kind === 'error' && (
        <p className="pdf-error" role="alert">
          {status.message}
        </p>
      )}

      {status.kind === 'done' && (
        <div className="pdf-result">
          <h4 title={status.result.fileName}>{status.result.title}</h4>
          <p className="pdf-meta">
            {status.result.numPages} trang · {status.result.charCount.toLocaleString('vi-VN')} ký tự
          </p>
          {status.result.truncated && (
            <p className="pdf-warn">Tài liệu dài, AI chỉ đọc phần đầu để tạo sơ đồ.</p>
          )}
          {status.result.summary && <p className="pdf-summary">{status.result.summary}</p>}
        </div>
      )}
    </section>
  )
}
