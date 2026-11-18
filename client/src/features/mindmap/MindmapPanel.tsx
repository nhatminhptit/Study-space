import { useState } from 'react'
import MindmapView from './MindmapView'
import { sampleMindmapJson } from './sampleData'

/*
 * Tab "So do tu duy" trong phong hoc: dan JSON vao o ben trai roi bam "Ve" de render.
 * Luong upload PDF -> AI sinh JSON (T04DEF0) se goi thang <MindmapView json={...} />.
 */
export default function MindmapPanel() {
  const [draft, setDraft] = useState(sampleMindmapJson)
  const [json, setJson] = useState(sampleMindmapJson)
  const [editorOpen, setEditorOpen] = useState(() => window.innerWidth > 900)

  return (
    <div className="mm-panel">
      <aside className="mm-editor" hidden={!editorOpen}>
        <h3>Dữ liệu JSON</h3>
        <p>
          Dạng <code>{'{ label, note?, children? }'}</code> hoặc cả response <code>{'{ title, summary, mindmap }'}</code>.
        </p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          aria-label="JSON mindmap"
        />
        <div className="mm-editor-actions">
          <button type="button" className="primary" onClick={() => setJson(draft)} disabled={draft === json}>
            Vẽ
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(sampleMindmapJson)
              setJson(sampleMindmapJson)
            }}
          >
            Dữ liệu mẫu
          </button>
        </div>
      </aside>

      <div className="mm-main">
        <div className="mm-main-bar">
          <button type="button" className="ghost" onClick={() => setEditorOpen((v) => !v)} aria-pressed={editorOpen}>
            {editorOpen ? 'Ẩn JSON' : 'Sửa JSON'}
          </button>
        </div>
        <MindmapView json={json} />
      </div>
    </div>
  )
}
