import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import { toPng } from "html-to-image";
import { Transformer } from "markmap-lib";
import { Markmap } from "markmap-view";
import {
  downloadDataUrl,
  downloadSvgElement,
  type ExportFormat,
  type MindmapExporter,
} from "./exportImage";
import { treeToMarkdown } from "./transform";
import type { MindmapTree } from "./types";

const transformer = new Transformer();
const svgStyle = { width: "100%", height: "100%", display: "block" };

interface MarkmapViewProps {
  tree: MindmapTree;
  exporterRef?: RefObject<MindmapExporter | null>;
}

export default function MarkmapView({ tree, exporterRef }: MarkmapViewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const mmRef = useRef<Markmap | null>(null);
  const markdown = useMemo(() => treeToMarkdown(tree), [tree]);

  useEffect(() => {
    if (!svgRef.current) return;
    const mm = Markmap.create(svgRef.current, { duration: 300, maxWidth: 260 });
    mmRef.current = mm;
    return () => {
      mm.destroy();
      mmRef.current = null;
    };
  }, []);

  useEffect(() => {
    const mm = mmRef.current;
    if (!mm) return;
    const { root } = transformer.transform(markdown);
    void Promise.resolve(mm.setData(root)).then(() => mm.fit());
  }, [markdown]);

  const exportImage = useCallback(
    async (format: ExportFormat, fileBaseName: string) => {
      const wrapEl = wrapperRef.current;
      const svgEl = svgRef.current;
      if (!wrapEl || !svgEl) {
        throw new Error("Không tìm thấy sơ đồ Markmap để xuất ảnh.");
      }

      if (mmRef.current) {
        await Promise.resolve(mmRef.current.fit());
        await new Promise((resolve) => window.setTimeout(resolve, 350));
      }

      if (format === "svg") {
        downloadSvgElement(svgEl, `${fileBaseName}.svg`, "#ffffff");
        return;
      }

      const rect = wrapEl.getBoundingClientRect();
      const width = Math.max(800, Math.ceil(rect.width));
      const height = Math.max(500, Math.ceil(rect.height));

      const dataUrl = await toPng(wrapEl, {
        backgroundColor: "#ffffff",
        width,
        height,
        pixelRatio: 2,
      });
      downloadDataUrl(dataUrl, `${fileBaseName}.png`);
    },
    [],
  );

  useEffect(() => {
    if (!exporterRef) return;
    const exporter: MindmapExporter = { exportImage };
    exporterRef.current = exporter;
    return () => {
      if (exporterRef.current === exporter) {
        exporterRef.current = null;
      }
    };
  }, [exporterRef, exportImage]);

  return (
    <div ref={wrapperRef} className="mm-markmap-wrap">
      <svg ref={svgRef} className="markmap-svg" style={svgStyle} />
    </div>
  );
}
