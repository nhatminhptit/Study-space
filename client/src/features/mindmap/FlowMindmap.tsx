import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import MindmapNode from './MindmapNode'
import { treeToFlow, type MindmapFlowNode } from './transform'
import type { MindmapTree } from './types'
import './mindmap.css'

const nodeTypes = { mindmap: MindmapNode }

/*
 * Mindmap tuong tac bang React Flow: keo tha node, zoom, click node de thu gon/mo rong nhanh.
 * Doi tree -> nen remount (truyen key) de reset trang thai thu gon va fitView lai.
 */
export default function FlowMindmap({ tree }: { tree: MindmapTree }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const layout = useMemo(() => treeToFlow(tree, collapsed), [tree, collapsed])
  const [nodes, setNodes, onNodesChange] = useNodesState<MindmapFlowNode>(layout.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges)

  // layout doi (thu gon/mo rong) -> cap nhat lai node/edge
  useEffect(() => {
    setNodes(layout.nodes)
    setEdges(layout.edges)
  }, [layout, setNodes, setEdges])

  const onNodeClick = useCallback<NodeMouseHandler<MindmapFlowNode>>((_, node) => {
    if (!node.data.childCount) return
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(node.id)) next.delete(node.id)
      else next.add(node.id)
      return next
    })
  }, [])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      nodesConnectable={false}
      edgesFocusable={false}
      fitView
      minZoom={0.1}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={20} />
      <Controls showInteractive={false} />
      <MiniMap<MindmapFlowNode> pannable zoomable nodeColor={(n) => n.data.color} />
    </ReactFlow>
  )
}
