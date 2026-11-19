import type { Edge, Node } from '@xyflow/react'
import type { MindmapNodeData, MindmapTree } from './types'

/*
 * Dinh dang JSON chuan (docs/API.md - POST /documents/analyze):
 *   { label: string, note?: string, children?: Node[] }
 * normalizeTree chap nhan ca cac bien the AI hay tra (title/name/text, nodes/subtopics)
 * va tu gan id theo duong dan nen AI khong can sinh id.
 */
export function normalizeTree(raw: unknown, path = '0'): MindmapTree {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`Node ${path} không hợp lệ: phải là object`)
  }
  const r = raw as Record<string, unknown>
  const label = r.label ?? r.title ?? r.name ?? r.text
  if (label === undefined || label === null || String(label).trim() === '') {
    throw new Error(`Node ${path} thiếu "label"`)
  }
  const kids = r.children ?? r.nodes ?? r.subtopics ?? []
  if (!Array.isArray(kids)) throw new Error(`Node ${path}: "children" phải là mảng`)
  const note = r.note ?? r.description
  return {
    id: path,
    label: String(label).trim(),
    note: note ? String(note) : undefined,
    children: kids.map((c, i) => normalizeTree(c, `${path}-${i}`)),
  }
}

// lay cay mindmap tu response backend ({ title, summary, mindmap }) hoac tu chinh cay
export function extractTree(data: unknown): MindmapTree {
  const r = data as { mindmap?: unknown } | null
  return normalizeTree(r && typeof r === 'object' && 'mindmap' in r ? r.mindmap : data)
}

// diem vao chinh: chuoi JSON -> cay da chuan hoa, bao loi de doc khi JSON sai
export function parseMindmapJson(json: string): MindmapTree {
  if (!json.trim()) throw new Error('Chưa có dữ liệu mindmap')
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch (e) {
    throw new Error(`JSON không hợp lệ: ${(e as Error).message}`, { cause: e })
  }
  return extractTree(data)
}

const BRANCH_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6', '#ec4899']
const ROOT_COLOR = '#334155'

export const NODE_WIDTH = 200
export const NODE_HEIGHT = 56
const H_GAP = 70
const V_GAP = 14

export type MindmapFlowNode = Node<MindmapNodeData, 'mindmap'>

/*
 * Chuyen cay -> nodes/edges cho React Flow, tu dan layout dang cay tu trai sang phai.
 * Node la xep lan luot theo chieu doc, node cha nam giua cac node con.
 * collapsed: tap id dang thu gon (an nhanh con).
 */
export function treeToFlow(root: MindmapTree, collapsed: ReadonlySet<string> = new Set()) {
  const nodes: MindmapFlowNode[] = []
  const edges: Edge[] = []
  let cursorY = 0

  function walk(node: MindmapTree, depth: number, parentId: string | null, color: string): number {
    const isCollapsed = collapsed.has(node.id)
    const visibleKids = isCollapsed ? [] : node.children

    let y: number
    if (visibleKids.length === 0) {
      y = cursorY
      cursorY += NODE_HEIGHT + V_GAP
    } else {
      // moi nhanh lon cua node goc co 1 mau rieng, nhanh con ke thua mau cua nhanh lon
      const ys = visibleKids.map((child, i) =>
        walk(child, depth + 1, node.id, depth === 0 ? BRANCH_COLORS[i % BRANCH_COLORS.length] : color),
      )
      y = (ys[0] + ys[ys.length - 1]) / 2
    }

    nodes.push({
      id: node.id,
      type: 'mindmap',
      position: { x: depth * (NODE_WIDTH + H_GAP), y },
      data: {
        label: node.label,
        note: node.note,
        depth,
        color,
        childCount: node.children.length,
        collapsed: isCollapsed,
      },
    })
    if (parentId) {
      edges.push({
        id: `${parentId}->${node.id}`,
        source: parentId,
        target: node.id,
        type: 'smoothstep',
        style: { stroke: color, strokeWidth: 2 },
      })
    }
    return y
  }

  walk(root, 0, null, ROOT_COLOR)
  return { nodes, edges }
}

// markdown coi mot so ky tu la cu phap -> escape de nhan hien dung nguyen van
function escapeMarkdown(text: string) {
  return text.replace(/\s+/g, ' ').replace(/([\\`*_[\]#<>|])/g, '\\$1')
}

// chuyen cay -> Markdown cho Markmap (# goc, cac nhanh la list long nhau)
export function treeToMarkdown(root: MindmapTree): string {
  const lines = [`# ${escapeMarkdown(root.label)}`]
  const walk = (node: MindmapTree, depth: number) => {
    for (const child of node.children) {
      lines.push(`${'  '.repeat(depth)}- ${escapeMarkdown(child.label)}`)
      walk(child, depth + 1)
    }
  }
  walk(root, 0)
  return lines.join('\n')
}
