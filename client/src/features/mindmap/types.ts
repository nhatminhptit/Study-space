// node mindmap sau khi chuan hoa (id do client tu sinh theo duong dan: "0", "0-1", "0-1-2"...)
export interface MindmapTree {
  id: string
  label: string
  note?: string
  children: MindmapTree[]
}

// du lieu gan vao moi node React Flow
export type MindmapNodeData = {
  label: string
  note?: string
  depth: number
  color: string
  childCount: number
  collapsed: boolean
}
