import { useMemo, useState } from 'react'
import FlowMindmap from './FlowMindmap'
import MarkmapView from './MarkmapView'
import { parseMindmapJson } from './transform'
import type { MindmapTree } from './types'
import './mindmap-view.css'

export type MindmapMode = 'flow' | 'markmap'

type Parsed = { tree: MindmapTree; error?: undefined } | { tree?: undefined; error: string }

function safeParse(json: string): Parsed {
  try {
    return { tree: parseMindmapJson(json) }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

/*
 * Component chinh cua T04DEEB: nhan chuoi JSON (cay { label, note?, children? }
 * hoac ca response { title, summary, mindmap }) va ve thanh so do tu duy.
 * Co 2 che do: React Flow (keo tha, minimap) va Markmap (gon, tu dong can).
 */
export default function MindmapView({ json, defaultMode = 'flow' }: { json: string; defaultMode?: MindmapMode }) {
  const [mode, setMode] = useState<MindmapMode>(defaultMode)
  const parsed = useMemo(() => safeParse(json), [json])

  return (
    <div className="mm-view">
      <div className="mm-toolbar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'flow'}
          className={mode === 'flow' ? 'primary' : ''}
          onClick={() => setMode('flow')}
        >
          React Flow
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'markmap'}
          className={mode === 'markmap' ? 'primary' : ''}
          onClick={() => setMode('markmap')}
        >
          Markmap
        </button>
        <span className="mm-hint">Click node có nhánh con để thu gọn / mở rộng</span>
      </div>

      <div className="mm-stage">
        {parsed.error !== undefined ? (
          <div className="mm-error" role="alert">
            Không vẽ được sơ đồ: {parsed.error}
          </div>
        ) : mode === 'flow' ? (
          // json doi -> remount de reset thu gon va fitView lai
          <FlowMindmap key={json} tree={parsed.tree} />
        ) : (
          <MarkmapView tree={parsed.tree} />
        )}
      </div>
    </div>
  )
}
