import { useEffect, useState } from 'react'

// nut sao chep nho, doi thanh dau tich trong 1.5s sau khi chep
export default function CopyButton({ text, label = 'Sao chép' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(t)
  }, [copied])

  return (
    <button
      type="button"
      className="ghost icon-button"
      title={copied ? 'Đã sao chép' : label}
      aria-label={label}
      onClick={() => {
        void navigator.clipboard
          ?.writeText(text)
          .then(() => setCopied(true))
          .catch(() => undefined)
      }}
    >
      {copied ? '✓' : '⧉'}
    </button>
  )
}
