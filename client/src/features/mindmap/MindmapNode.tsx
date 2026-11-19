import { memo, type CSSProperties } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { NODE_HEIGHT, NODE_WIDTH, type MindmapFlowNode } from './transform'

// giao dien 1 node: nhan + nut thu gon/mo rong (hien so nhanh con khi dang thu gon)
function MindmapNode({ data }: NodeProps<MindmapFlowNode>) {
  const isRoot = data.depth === 0
  const style = { width: NODE_WIDTH, minHeight: NODE_HEIGHT, borderColor: data.color } as CSSProperties

  return (
    <div
      className={`mm-node ${isRoot ? 'root' : ''} ${data.note ? 'has-note' : ''}`}
      style={style}
      title={data.note ? `${data.label}\n\n${data.note}` : data.label}
    >
      {!isRoot && <Handle type="target" position={Position.Left} isConnectable={false} />}
      <span className="mm-label">{data.label}</span>
      {data.childCount > 0 && (
        <span className="mm-toggle" style={{ background: data.color }}>
          {data.collapsed ? `+${data.childCount}` : '−'}
        </span>
      )}
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  )
}

export default memo(MindmapNode)
