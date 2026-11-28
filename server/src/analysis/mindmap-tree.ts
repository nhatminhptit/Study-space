export interface MindmapNode {
  label: string;
  note?: string;
  children?: MindmapNode[];
}

// Limits agreed in docs/API.md (POST /documents/analyze)
export const MAX_DEPTH = 4;
export const MAX_CHILDREN = 7;
export const MAX_LABEL_LENGTH = 60;
export const MAX_NOTE_LENGTH = 200;

function pickText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value).replace(/\s+/g, ' ').trim();
      if (text) return text;
    }
  }
  return '';
}

function shorten(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function toNode(raw: unknown, depth: number): MindmapNode | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;

  const label = pickText(r.label, r.title, r.name, r.text);
  if (!label) return null;

  const node: MindmapNode = { label: shorten(label, MAX_LABEL_LENGTH) };

  const note = pickText(r.note, r.description);
  if (note) node.note = shorten(note, MAX_NOTE_LENGTH);

  const rawKids = r.children ?? r.nodes ?? r.subtopics;
  if (depth < MAX_DEPTH && Array.isArray(rawKids)) {
    const children = rawKids
      .map((kid) => toNode(kid, depth + 1))
      .filter((kid): kid is MindmapNode => kid !== null)
      .slice(0, MAX_CHILDREN);
    if (children.length) node.children = children;
  }

  return node;
}

/*
 * Clean the tree returned by the AI so the client always gets the agreed shape:
 * { label, note?, children? }, at most 4 levels and 7 children per node.
 * Accepts common variants (title/name, nodes/subtopics) and a wrapping
 * { mindmap: ... } or a one element array. Returns null when nothing usable.
 */
export function sanitizeMindmap(raw: unknown): MindmapNode | null {
  let data = raw;
  if (Array.isArray(data) && data.length === 1) data = data[0];
  if (data && typeof data === 'object' && 'mindmap' in data) {
    data = (data as { mindmap: unknown }).mindmap;
  }
  return toNode(data, 1);
}
