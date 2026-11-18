import { describe, expect, it } from 'vitest'
import { extractTree, normalizeTree, parseMindmapJson, treeToFlow, treeToMarkdown } from './transform'

const raw = {
  title: 'Tài liệu',
  mindmap: {
    label: 'Gốc',
    children: [{ title: 'A', description: 'ghi chú', nodes: [{ name: 'A1' }, { text: 'A2' }] }, { label: 'B' }],
  },
}

describe('parseMindmapJson', () => {
  it('nhan ca response day du lan chi cay', () => {
    expect(parseMindmapJson(JSON.stringify(raw)).label).toBe('Gốc')
    expect(parseMindmapJson(JSON.stringify(raw.mindmap)).children).toHaveLength(2)
  })

  it('bao loi ro rang khi JSON sai cu phap hoac rong', () => {
    expect(() => parseMindmapJson('{ label: ')).toThrow(/JSON không hợp lệ/)
    expect(() => parseMindmapJson('   ')).toThrow(/Chưa có dữ liệu/)
  })
})

describe('normalizeTree', () => {
  it('chap nhan ten truong bien the va tu sinh id theo duong dan', () => {
    const tree = extractTree(raw)
    expect(tree.id).toBe('0')
    expect(tree.children.map((c) => [c.id, c.label, c.note])).toEqual([
      ['0-0', 'A', 'ghi chú'],
      ['0-1', 'B', undefined],
    ])
    expect(tree.children[0].children.map((c) => c.id)).toEqual(['0-0-0', '0-0-1'])
  })

  it('bao loi khi node thieu label hoac children khong phai mang', () => {
    expect(() => normalizeTree({ children: [] })).toThrow(/label/)
    expect(() => normalizeTree({ label: 'X', children: 'abc' })).toThrow(/mảng/)
    expect(() => normalizeTree([])).toThrow(/object/)
  })
})

describe('treeToFlow', () => {
  const tree = extractTree(raw)

  it('tao du node/edge, node cha nam giua cac node con', () => {
    const { nodes, edges } = treeToFlow(tree)
    expect(nodes).toHaveLength(5)
    expect(edges).toHaveLength(4)
    const y = (id: string) => nodes.find((n) => n.id === id)!.position.y
    expect(y('0-0')).toBe((y('0-0-0') + y('0-0-1')) / 2)
  })

  it('nhanh con ke thua mau cua nhanh lon', () => {
    const { nodes } = treeToFlow(tree)
    const color = (id: string) => nodes.find((n) => n.id === id)!.data.color
    expect(color('0-0-1')).toBe(color('0-0'))
    expect(color('0-0')).not.toBe(color('0-1'))
  })

  it('an nhanh con khi thu gon', () => {
    const { nodes } = treeToFlow(tree, new Set(['0-0']))
    expect(nodes.map((n) => n.id).sort()).toEqual(['0', '0-0', '0-1'])
    expect(nodes.find((n) => n.id === '0-0')!.data).toMatchObject({ collapsed: true, childCount: 2 })
  })
})

describe('treeToMarkdown', () => {
  it('goc la heading, nhanh la list long nhau', () => {
    expect(treeToMarkdown(extractTree(raw))).toBe('# Gốc\n- A\n  - A1\n  - A2\n- B')
  })

  it('escape ky tu markdown trong nhan', () => {
    expect(treeToMarkdown(normalizeTree({ label: 'a*b', children: [{ label: '[x]' }] }))).toBe('# a\\*b\n- \\[x\\]')
  })
})
