// Build a tiny valid PDF in memory for tests (one page per text item)
export function buildPdf(pages: string[], title?: string): Buffer {
  const objects: string[] = [];
  const pageIds = pages.map((_, i) => 4 + i * 2);

  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;

  pages.forEach((content, i) => {
    const pageId = pageIds[i];
    const stream = content
      ? `BT /F1 12 Tf 72 720 Td (${content.replace(/([()\\])/g, '\\$1')}) Tj ET`
      : '';
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
      `/Resources << /Font << /F1 3 0 R >> >> /Contents ${pageId + 1} 0 R >>`;
    objects[pageId + 1] =
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  const infoId = objects.length;
  if (title) objects[infoId] = `<< /Title (${title}) >>`;

  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = body.length;
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }

  const xrefStart = body.length;
  body += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) {
    body += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  body +=
    `trailer\n<< /Size ${objects.length} /Root 1 0 R` +
    (title ? ` /Info ${infoId} 0 R` : '') +
    ` >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(body, 'latin1');
}
