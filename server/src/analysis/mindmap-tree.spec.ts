import {
  MAX_CHILDREN,
  MAX_LABEL_LENGTH,
  sanitizeMindmap,
  type MindmapNode,
} from './mindmap-tree.js';

function depthOf(node: MindmapNode): number {
  const kids = node.children ?? [];
  return 1 + (kids.length ? Math.max(...kids.map(depthOf)) : 0);
}

describe('sanitizeMindmap', () => {
  it('keeps a valid tree as it is', () => {
    const tree = {
      label: 'Đạo hàm',
      children: [
        { label: 'Định nghĩa', note: 'Giới hạn của tỉ số gia số' },
        { label: 'Quy tắc tính', children: [{ label: 'Hàm hợp' }] },
      ],
    };

    expect(sanitizeMindmap(tree)).toEqual(tree);
  });

  it('accepts title/name and nodes/subtopics variants', () => {
    const result = sanitizeMindmap({
      title: 'Gốc',
      nodes: [
        { name: 'A', subtopics: [{ text: 'A1', description: 'ghi chú' }] },
      ],
    });

    expect(result).toEqual({
      label: 'Gốc',
      children: [{ label: 'A', children: [{ label: 'A1', note: 'ghi chú' }] }],
    });
  });

  it('unwraps { mindmap } and a one element array', () => {
    expect(sanitizeMindmap({ mindmap: { label: 'X' } })).toEqual({
      label: 'X',
    });
    expect(sanitizeMindmap([{ label: 'Y' }])).toEqual({ label: 'Y' });
  });

  it('drops nodes without label and limits children per node', () => {
    const kids = Array.from({ length: 10 }, (_, i) => ({ label: `Ý ${i}` }));
    const result = sanitizeMindmap({
      label: 'Gốc',
      children: [{ label: '  ' }, null, 'text', ...kids],
    });

    expect(result?.children).toHaveLength(MAX_CHILDREN);
    expect(result?.children?.[0].label).toBe('Ý 0');
  });

  it('cuts the tree at 4 levels', () => {
    const deep = {
      label: '1',
      children: [
        {
          label: '2',
          children: [
            {
              label: '3',
              children: [{ label: '4', children: [{ label: '5' }] }],
            },
          ],
        },
      ],
    };

    expect(depthOf(sanitizeMindmap(deep)!)).toBe(4);
  });

  it('shortens long labels and collapses whitespace', () => {
    const result = sanitizeMindmap({ label: `  a\n  b ${'x'.repeat(100)}` });

    expect(result?.label.length).toBe(MAX_LABEL_LENGTH);
    expect(result?.label.startsWith('a b x')).toBe(true);
    expect(result?.label.endsWith('…')).toBe(true);
  });

  it('returns null when there is no usable root', () => {
    expect(sanitizeMindmap(null)).toBeNull();
    expect(sanitizeMindmap('text')).toBeNull();
    expect(sanitizeMindmap({ children: [] })).toBeNull();
    expect(sanitizeMindmap([{ label: 'a' }, { label: 'b' }])).toBeNull();
  });
});
