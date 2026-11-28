export type ExportFormat = "png" | "svg";

export interface MindmapExporter {
  exportImage: (format: ExportFormat, fileBaseName: string) => Promise<void>;
}

export function slugifyFilename(
  name: string | undefined,
  fallback = "mindmap",
): string {
  if (!name) return fallback;
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || fallback;
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function downloadSvgElement(
  svgEl: SVGSVGElement,
  filename: string,
  backgroundColor = "#ffffff",
): void {
  const rect = svgEl.getBoundingClientRect();
  const width = Math.max(800, Math.ceil(rect.width));
  const height = Math.max(500, Math.ceil(rect.height));

  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bgRect.setAttribute("width", "100%");
  bgRect.setAttribute("height", "100%");
  bgRect.setAttribute("fill", backgroundColor);
  clone.insertBefore(bgRect, clone.firstChild);

  const serializer = new XMLSerializer();
  const svgText = `<?xml version="1.0" encoding="UTF-8"?>\n${serializer.serializeToString(clone)}`;
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    downloadDataUrl(url, filename);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
