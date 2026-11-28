import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  getNodesBounds,
  getViewportForBounds,
  useEdgesState,
  useNodesState,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng, toSvg } from "html-to-image";
import {
  downloadDataUrl,
  type ExportFormat,
  type MindmapExporter,
} from "./exportImage";
import MindmapNode from "./MindmapNode";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  treeToFlow,
  type MindmapFlowNode,
} from "./transform";
import type { MindmapTree } from "./types";
import "./mindmap.css";

const nodeTypes = { mindmap: MindmapNode };

interface FlowMindmapProps {
  tree: MindmapTree;
  exporterRef?: RefObject<MindmapExporter | null>;
}

export default function FlowMindmap({ tree, exporterRef }: FlowMindmapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const layout = useMemo(() => treeToFlow(tree, collapsed), [tree, collapsed]);
  const [nodes, setNodes, onNodesChange] = useNodesState<MindmapFlowNode>(
    layout.nodes,
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);

  useEffect(() => {
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [layout, setNodes, setEdges]);

  const onNodeClick = useCallback<NodeMouseHandler<MindmapFlowNode>>(
    (_, node) => {
      if (!node.data.childCount) return;
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    },
    [],
  );

  const exportImage = useCallback(
    async (format: ExportFormat, fileBaseName: string) => {
      const viewportEl = wrapperRef.current?.querySelector<HTMLElement>(
        ".react-flow__viewport",
      );
      if (!viewportEl || nodes.length === 0) {
        throw new Error("Không tìm thấy sơ đồ để xuất ảnh.");
      }

      const normalizedNodes = nodes.map((n) => ({
        ...n,
        measured: {
          width: n.measured?.width ?? NODE_WIDTH,
          height: n.measured?.height ?? NODE_HEIGHT,
        },
      }));

      const bounds = getNodesBounds(normalizedNodes);
      const padding = 64;
      const imageWidth = Math.max(960, Math.ceil(bounds.width + padding * 2));
      const imageHeight = Math.max(600, Math.ceil(bounds.height + padding * 2));
      const viewport = getViewportForBounds(
        bounds,
        imageWidth,
        imageHeight,
        0.1,
        2,
        0.08,
      );
      const pixelRatio = Math.max(imageWidth, imageHeight) > 4000 ? 1 : 2;

      const options = {
        backgroundColor: "#ffffff",
        width: imageWidth,
        height: imageHeight,
        pixelRatio,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
      };

      const dataUrl =
        format === "svg"
          ? await toSvg(viewportEl, options)
          : await toPng(viewportEl, options);
      downloadDataUrl(dataUrl, `${fileBaseName}.${format}`);
    },
    [nodes],
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
    <div ref={wrapperRef} className="mm-flow-wrap">
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
        <MiniMap<MindmapFlowNode>
          pannable
          zoomable
          nodeColor={(n) => n.data.color}
        />
      </ReactFlow>
    </div>
  );
}
