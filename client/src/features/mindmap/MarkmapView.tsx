import { useEffect, useMemo, useRef } from 'react'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'
import { treeToMarkdown } from './transform'
import type { MindmapTree } from './types'

const transformer = new Transformer()
const svgStyle = { width: '100%', height: '100%', display: 'block' }

// mindmap dang Markmap: tu ve tu Markdown, click node de thu gon, cuon de zoom
export default function MarkmapView({ tree }: { tree: MindmapTree }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const mmRef = useRef<Markmap | null>(null)
  const markdown = useMemo(() => treeToMarkdown(tree), [tree])

  // tao/huy instance Markmap theo vong doi component
  useEffect(() => {
    if (!svgRef.current) return
    const mm = Markmap.create(svgRef.current, { duration: 300, maxWidth: 260 })
    mmRef.current = mm
    return () => {
      mm.destroy()
      mmRef.current = null
    }
  }, [])

  // du lieu doi -> ve lai va canh giua
  useEffect(() => {
    const mm = mmRef.current
    if (!mm) return
    const { root } = transformer.transform(markdown)
    void Promise.resolve(mm.setData(root)).then(() => mm.fit())
  }, [markdown])

  return <svg ref={svgRef} className="markmap-svg" style={svgStyle} />
}
