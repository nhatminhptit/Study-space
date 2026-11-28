import { useMemo, useRef, useState } from "react";
import {
  slugifyFilename,
  type ExportFormat,
  type MindmapExporter,
} from "./exportImage";
import FlowMindmap from "./FlowMindmap";
import MarkmapView from "./MarkmapView";
import { parseMindmapJson } from "./transform";
import type { MindmapTree } from "./types";
import "./mindmap-view.css";

export type MindmapMode = "flow" | "markmap";

type Parsed =
  | { tree: MindmapTree; error?: undefined }
  | { tree?: undefined; error: string };

function safeParse(json: string): Parsed {
  try {
    return { tree: parseMindmapJson(json) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export default function MindmapView({
  json,
  defaultMode = "flow",
}: {
  json: string;
  defaultMode?: MindmapMode;
}) {
  const [mode, setMode] = useState<MindmapMode>(defaultMode);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState("");
  const exporterRef = useRef<MindmapExporter | null>(null);
  const parsed = useMemo(() => safeParse(json), [json]);

  async function handleExport(format: ExportFormat) {
    if (!parsed.tree || !exporterRef.current || exporting) return;
    setExportError("");
    setExporting(format);
    try {
      const rootNode = parsed.tree as { label?: string; title?: string };
      const baseName = slugifyFilename(
        rootNode.label || rootNode.title,
        "mindmap",
      );
      await exporterRef.current.exportImage(format, `${baseName}-${mode}`);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Xuất ảnh sơ đồ thất bại.",
      );
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="mm-view">
      <div className="mm-toolbar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "flow"}
          className={mode === "flow" ? "primary" : ""}
          onClick={() => {
            setExportError("");
            setMode("flow");
          }}
        >
          React Flow
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "markmap"}
          className={mode === "markmap" ? "primary" : ""}
          onClick={() => {
            setExportError("");
            setMode("markmap");
          }}
        >
          Markmap
        </button>

        <div className="mm-export-group">
          <button
            type="button"
            disabled={!parsed.tree || exporting !== null}
            onClick={() => void handleExport("png")}
            title="Tải sơ đồ tư duy dưới dạng ảnh PNG độ phân giải cao"
          >
            {exporting === "png" ? "Đang xuất PNG…" : "Xuất PNG"}
          </button>
          <button
            type="button"
            disabled={!parsed.tree || exporting !== null}
            onClick={() => void handleExport("svg")}
            title="Tải sơ đồ tư duy dưới dạng ảnh vector SVG"
          >
            {exporting === "svg" ? "Đang xuất SVG…" : "Xuất SVG"}
          </button>
        </div>

        <span className="mm-hint">
          Click node có nhánh con để thu gọn / mở rộng
        </span>
      </div>

      {exportError && (
        <div className="mm-export-error" role="alert">
          {exportError}
        </div>
      )}

      <div className="mm-stage">
        {parsed.error !== undefined ? (
          <div className="mm-error" role="alert">
            Không vẽ được sơ đồ: {parsed.error}
          </div>
        ) : mode === "flow" ? (
          <FlowMindmap
            key={json}
            tree={parsed.tree}
            exporterRef={exporterRef}
          />
        ) : (
          <MarkmapView tree={parsed.tree} exporterRef={exporterRef} />
        )}
      </div>
    </div>
  );
}
