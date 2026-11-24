import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, FabricObject, IText, PencilBrush } from "fabric";
import { getSocket } from "../../services/socket";
import {
  createShapeObject,
  createStickyNoteObject,
  createTextObject,
  detectDashStyle,
  getDashArray,
  hexToRgba,
  SHAPE_CATALOG,
  type DashStyle,
  type ShapeKind,
} from "./shapes";
import "./whiteboard.css";

type ToolMode = "pen" | "highlighter" | "select";

interface WhiteboardSyncPayload {
  roomId: number;
  canvasJson: Record<string, unknown>;
}

interface RoomPeersPayload {
  roomId: number;
  count: number;
}

const STROKE_COLORS = [
  "#1e293b",
  "#ef4444",
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#9333ea",
];
const FILL_COLORS = [
  "transparent",
  "#ffffff",
  "#fef08a",
  "#bfdbfe",
  "#bbf7d0",
  "#fecaca",
  "#e9d5ff",
];
const MAX_HISTORY = 30;

export default function WhiteboardPanel({ roomId }: { roomId: number }) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isSyncingRef = useRef(false);
  const spawnCountRef = useRef(0);
  const broadcastTimerRef = useRef<number | null>(null);

  const [tool, setTool] = useState<ToolMode>("pen");
  const [strokeColor, setStrokeColor] = useState("#1e293b");
  const [fillColor, setFillColor] = useState("transparent");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [dashStyle, setDashStyle] = useState<DashStyle>("solid");
  const [showGrid, setShowGrid] = useState(true);
  const [shapesOpen, setShapesOpen] = useState(false);

  const [hasSelection, setHasSelection] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [peerCount, setPeerCount] = useState(1);

  const emitBoardNow = useCallback(
    (canvas: Canvas) => {
      const socket = getSocket();
      if (!socket.connected) return;
      socket.emit("whiteboard:update", {
        roomId,
        canvasJson: canvas.toJSON(),
      });
    },
    [roomId],
  );

  const scheduleBroadcast = useCallback(
    (canvas: Canvas) => {
      if (broadcastTimerRef.current !== null) {
        window.clearTimeout(broadcastTimerRef.current);
      }
      broadcastTimerRef.current = window.setTimeout(() => {
        broadcastTimerRef.current = null;
        emitBoardNow(canvas);
      }, 80);
    },
    [emitBoardNow],
  );

  const saveSnapshot = useCallback(
    (canvas: Canvas, shouldBroadcast = true) => {
      if (isSyncingRef.current) return;
      const snapshot = JSON.stringify(canvas.toJSON());
      const current = historyRef.current[historyIndexRef.current];
      if (snapshot === current) return;

      const next = historyRef.current.slice(0, historyIndexRef.current + 1);
      next.push(snapshot);
      if (next.length > MAX_HISTORY) next.shift();

      historyRef.current = next;
      historyIndexRef.current = next.length - 1;
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(false);

      if (shouldBroadcast) {
        scheduleBroadcast(canvas);
      }
    },
    [scheduleBroadcast],
  );

  const restoreHistory = useCallback(
    async (delta: number) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const targetIdx = historyIndexRef.current + delta;
      if (targetIdx < 0 || targetIdx >= historyRef.current.length) return;

      isSyncingRef.current = true;
      try {
        await canvas.loadFromJSON(JSON.parse(historyRef.current[targetIdx]));
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        historyIndexRef.current = targetIdx;
        setCanUndo(targetIdx > 0);
        setCanRedo(targetIdx < historyRef.current.length - 1);
        setHasSelection(false);
        emitBoardNow(canvas);
      } finally {
        isSyncingRef.current = false;
      }
    },
    [emitBoardNow],
  );

  const duplicateSelected = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;

    const cloned = await active.clone();
    cloned.set({
      left: (active.left ?? 0) + 24,
      top: (active.top ?? 0) + 24,
    });
    canvas.add(cloned);
    canvas.setActiveObject(cloned);
    canvas.requestRenderAll();
    saveSnapshot(canvas);
  }, [saveSnapshot]);

  useEffect(() => {
    if (!shapesOpen) return;
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShapesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [shapesOpen]);

  useEffect(() => {
    const stage = stageRef.current;
    const canvasEl = canvasElRef.current;
    if (!stage || !canvasEl) return;

    const canvas = new Canvas(canvasEl, {
      width: stage.clientWidth || 800,
      height: stage.clientHeight || 500,
      isDrawingMode: true,
      preserveObjectStacking: true,
    });

    const brush = new PencilBrush(canvas);
    brush.color = "#1e293b";
    brush.width = 3;
    canvas.freeDrawingBrush = brush;
    fabricRef.current = canvas;

    historyRef.current = [JSON.stringify(canvas.toJSON())];
    historyIndexRef.current = 0;

    function syncFromSelection() {
      const selected = canvas.getActiveObjects();
      setHasSelection(selected.length > 0);
      if (selected.length !== 1) return;

      const obj = selected[0];
      if (obj instanceof IText) {
        if (typeof obj.fill === "string" && obj.fill.startsWith("#")) {
          setStrokeColor(obj.fill);
        }
        if (typeof obj.backgroundColor === "string" && obj.backgroundColor) {
          setFillColor(obj.backgroundColor);
        } else {
          setFillColor("transparent");
        }
        return;
      }

      if (typeof obj.stroke === "string" && obj.stroke.startsWith("#")) {
        setStrokeColor(obj.stroke);
      }
      if (typeof obj.fill === "string" && obj.fill) {
        setFillColor(obj.fill === "" ? "transparent" : obj.fill);
      } else {
        setFillColor("transparent");
      }
      if (typeof obj.strokeWidth === "number" && obj.strokeWidth > 0) {
        setStrokeWidth(Math.min(20, Math.round(obj.strokeWidth)));
      }
      setDashStyle(detectDashStyle(obj.strokeDashArray));
    }

    const onChanged = () => saveSnapshot(canvas, true);

    canvas.on("selection:created", syncFromSelection);
    canvas.on("selection:updated", syncFromSelection);
    canvas.on("selection:cleared", () => setHasSelection(false));
    canvas.on("object:added", onChanged);
    canvas.on("object:modified", onChanged);
    canvas.on("object:removed", onChanged);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        canvas.setDimensions({
          width: Math.floor(width),
          height: Math.floor(height),
        });
        canvas.requestRenderAll();
      }
    });
    observer.observe(stage);

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
        return;

      const active = canvas.getActiveObjects();
      const editingText = active.some(
        (obj) => obj instanceof IText && obj.isEditing,
      );
      if (editingText) return;

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        void restoreHistory(e.shiftKey ? 1 : -1);
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        void restoreHistory(1);
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        void duplicateSelected();
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && active.length > 0) {
        canvas.remove(...active);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      observer.disconnect();
      if (broadcastTimerRef.current !== null) {
        window.clearTimeout(broadcastTimerRef.current);
        broadcastTimerRef.current = null;
      }
      fabricRef.current = null;
      void canvas.dispose();
    };
  }, [duplicateSelected, restoreHistory, saveSnapshot]);

  useEffect(() => {
    const socket = getSocket();

    const applyRemoteBoard = async (payload: WhiteboardSyncPayload) => {
      if (payload.roomId !== roomId) return;
      const canvas = fabricRef.current;
      if (!canvas) return;

      isSyncingRef.current = true;
      try {
        await canvas.loadFromJSON(payload.canvasJson);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        setHasSelection(false);

        const snapshot = JSON.stringify(canvas.toJSON());
        historyRef.current = [snapshot];
        historyIndexRef.current = 0;
        setCanUndo(false);
        setCanRedo(false);
      } finally {
        isSyncingRef.current = false;
      }
    };

    const handleRemoteClear = (payload: { roomId: number }) => {
      if (payload.roomId !== roomId) return;
      const canvas = fabricRef.current;
      if (!canvas) return;

      isSyncingRef.current = true;
      try {
        canvas.clear();
        canvas.requestRenderAll();
        setHasSelection(false);

        const snapshot = JSON.stringify(canvas.toJSON());
        historyRef.current = [snapshot];
        historyIndexRef.current = 0;
        setCanUndo(false);
        setCanRedo(false);
      } finally {
        isSyncingRef.current = false;
      }
    };

    const handlePeers = (payload: RoomPeersPayload) => {
      if (payload.roomId === roomId) {
        setPeerCount(payload.count);
      }
    };

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit("room:join", { roomId });
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("room:peers", handlePeers);
    socket.on("whiteboard:state", applyRemoteBoard);
    socket.on("whiteboard:update", applyRemoteBoard);
    socket.on("whiteboard:clear", handleRemoteClear);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.emit("room:leave", { roomId });
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("room:peers", handlePeers);
      socket.off("whiteboard:state", applyRemoteBoard);
      socket.off("whiteboard:update", applyRemoteBoard);
      socket.off("whiteboard:clear", handleRemoteClear);
    };
  }, [roomId]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = tool === "pen" || tool === "highlighter";
    if (!canvas.freeDrawingBrush) return;

    if (tool === "highlighter") {
      canvas.freeDrawingBrush.color = hexToRgba(strokeColor, 0.35);
      canvas.freeDrawingBrush.width = Math.max(16, strokeWidth * 3);
      canvas.freeDrawingBrush.strokeDashArray = null;
    } else {
      canvas.freeDrawingBrush.color = strokeColor;
      canvas.freeDrawingBrush.width = strokeWidth;
      canvas.freeDrawingBrush.strokeDashArray = getDashArray(
        dashStyle,
        strokeWidth,
      );
    }
  }, [tool, strokeColor, strokeWidth, dashStyle]);

  function updateSelected(updater: (obj: FabricObject) => void) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const selected = canvas.getActiveObjects();
    if (selected.length === 0) return;

    selected.forEach(updater);
    canvas.requestRenderAll();
    saveSnapshot(canvas);
  }

  function handleStrokeColorChange(nextColor: string) {
    setStrokeColor(nextColor);
    updateSelected((obj) => {
      if (obj instanceof IText) {
        obj.set("fill", nextColor);
      } else {
        obj.set("stroke", nextColor);
      }
    });
  }

  function handleFillColorChange(nextFill: string) {
    setFillColor(nextFill);
    updateSelected((obj) => {
      if (obj instanceof IText) {
        obj.set("backgroundColor", nextFill === "transparent" ? "" : nextFill);
      } else if (obj.type !== "line" && obj.type !== "path") {
        obj.set("fill", nextFill);
      } else if (obj.type === "path" && obj.fill !== "") {
        obj.set("fill", nextFill);
      }
    });
  }

  function handleStrokeWidthChange(nextWidth: number) {
    setStrokeWidth(nextWidth);
    updateSelected((obj) => {
      if (!(obj instanceof IText)) {
        const currentDash = detectDashStyle(obj.strokeDashArray);
        obj.set({
          strokeWidth: nextWidth,
          strokeDashArray: getDashArray(currentDash, nextWidth),
        });
      }
    });
  }

  function handleDashChange(nextDash: DashStyle) {
    setDashStyle(nextDash);
    updateSelected((obj) => {
      if (!(obj instanceof IText)) {
        const w =
          typeof obj.strokeWidth === "number" ? obj.strokeWidth : strokeWidth;
        obj.set("strokeDashArray", getDashArray(nextDash, w));
      }
    });
  }

  function nextOffset() {
    const off = (spawnCountRef.current % 6) * 24;
    spawnCountRef.current += 1;
    return off;
  }

  function addShape(kind: ShapeKind) {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const shape = createShapeObject(
      kind,
      { stroke: strokeColor, fill: fillColor, strokeWidth, dash: dashStyle },
      nextOffset(),
    );
    canvas.add(shape);
    canvas.setActiveObject(shape);
    setTool("select");
    setShapesOpen(false);
  }

  function addText() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const text = createTextObject(strokeColor, nextOffset());
    canvas.add(text);
    canvas.setActiveObject(text);
    setTool("select");
  }

  function addStickyNote() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const note = createStickyNoteObject(nextOffset());
    canvas.add(note);
    canvas.setActiveObject(note);
    setTool("select");
  }

  function moveLayer(direction: "front" | "back") {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    if (direction === "front") {
      canvas.bringObjectForward(active);
    } else {
      canvas.sendObjectBackwards(active);
    }
    canvas.requestRenderAll();
    saveSnapshot(canvas);
  }

  function deleteSelected() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length === 0) return;
    canvas.remove(...active);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }

  function clearBoard() {
    const canvas = fabricRef.current;
    if (!canvas) return;

    isSyncingRef.current = true;
    try {
      canvas.clear();
      canvas.requestRenderAll();
    } finally {
      isSyncingRef.current = false;
    }

    saveSnapshot(canvas, false);
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("whiteboard:clear", { roomId });
    }
  }

  function exportPng() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const prevBg = canvas.backgroundColor;
    canvas.backgroundColor = "#ffffff";
    canvas.renderAll();
    const url = canvas.toDataURL({ format: "png", multiplier: 2 });
    canvas.backgroundColor = prevBg;
    canvas.renderAll();

    const link = document.createElement("a");
    link.href = url;
    link.download = `whiteboard-room-${roomId}.png`;
    link.click();
  }

  const basicShapes = SHAPE_CATALOG.filter((s) => s.group === "basic");
  const lineShapes = SHAPE_CATALOG.filter((s) => s.group === "line");

  return (
    <div className="whiteboard">
      <div className="wb-toolbar">
        <div className="wb-group">
          <button
            type="button"
            className={`wb-btn ${tool === "select" ? "active" : ""}`}
            onClick={() => setTool("select")}
          >
            Chọn
          </button>
          <button
            type="button"
            className={`wb-btn ${tool === "pen" ? "active" : ""}`}
            onClick={() => setTool("pen")}
          >
            Bút vẽ
          </button>
          <button
            type="button"
            className={`wb-btn ${tool === "highlighter" ? "active" : ""}`}
            onClick={() => setTool("highlighter")}
            title="Bút dạ quang bán trong suốt"
          >
            Dạ quang
          </button>
        </div>

        <div className="wb-group">
          <div className="wb-dropdown-wrap" ref={menuRef}>
            <button
              type="button"
              className={`wb-btn ${shapesOpen ? "active" : ""}`}
              onClick={() => setShapesOpen((v) => !v)}
            >
              + Hình dạng ▾
            </button>

            {shapesOpen && (
              <div className="wb-shapes-menu">
                <div className="wb-menu-title">Hình cơ bản</div>
                <div className="wb-shapes-grid">
                  {basicShapes.map((item) => (
                    <button
                      key={item.kind}
                      type="button"
                      className="wb-shape-item"
                      title={item.label}
                      onClick={() => addShape(item.kind)}
                    >
                      <svg viewBox="0 0 24 24">
                        <path d={item.svgPath} />
                      </svg>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>

                <div className="wb-menu-title">Đường kẻ &amp; Mũi tên</div>
                <div className="wb-shapes-grid">
                  {lineShapes.map((item) => (
                    <button
                      key={item.kind}
                      type="button"
                      className="wb-shape-item"
                      title={item.label}
                      onClick={() => addShape(item.kind)}
                    >
                      <svg viewBox="0 0 24 24">
                        <path d={item.svgPath} />
                      </svg>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button type="button" className="wb-btn" onClick={addText}>
            + Chữ
          </button>
          <button type="button" className="wb-btn" onClick={addStickyNote}>
            + Ghi chú
          </button>
        </div>

        <div className="wb-group">
          <div className="wb-color-block">
            <span className="wb-label">Viền:</span>
            {STROKE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`wb-swatch ${strokeColor === c ? "active" : ""}`}
                style={{ background: c }}
                aria-label={`Màu viền ${c}`}
                onClick={() => handleStrokeColorChange(c)}
              />
            ))}
            <input
              type="color"
              className="wb-color-input"
              value={strokeColor}
              onChange={(e) => handleStrokeColorChange(e.target.value)}
              title="Chọn màu viền tuỳ chỉnh"
            />
          </div>
        </div>

        <div className="wb-group">
          <div className="wb-color-block">
            <span className="wb-label">Nền:</span>
            {FILL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`wb-swatch ${c === "transparent" ? "none" : ""} ${fillColor === c ? "active" : ""}`}
                style={c === "transparent" ? undefined : { background: c }}
                aria-label={
                  c === "transparent" ? "Không màu nền" : `Màu nền ${c}`
                }
                title={c === "transparent" ? "Trong suốt" : c}
                onClick={() => handleFillColorChange(c)}
              />
            ))}
            <input
              type="color"
              className="wb-color-input"
              value={fillColor === "transparent" ? "#ffffff" : fillColor}
              onChange={(e) => handleFillColorChange(e.target.value)}
              title="Chọn màu nền tuỳ chỉnh"
            />
          </div>
        </div>

        <div className="wb-group">
          <label className="wb-size">
            {strokeWidth}px
            <input
              type="range"
              min={1}
              max={20}
              value={strokeWidth}
              onChange={(e) => handleStrokeWidthChange(Number(e.target.value))}
            />
          </label>
          <select
            className="wb-select"
            value={dashStyle}
            onChange={(e) => handleDashChange(e.target.value as DashStyle)}
            aria-label="Kiểu nét vẽ"
          >
            <option value="solid">Nét liền</option>
            <option value="dashed">Nét đứt</option>
            <option value="dotted">Nét chấm</option>
          </select>
        </div>

        <div className="wb-group">
          <button
            type="button"
            className="wb-btn"
            disabled={!canUndo}
            onClick={() => void restoreHistory(-1)}
            title="Hoàn tác (Ctrl+Z)"
          >
            ↶
          </button>
          <button
            type="button"
            className="wb-btn"
            disabled={!canRedo}
            onClick={() => void restoreHistory(1)}
            title="Làm lại (Ctrl+Y)"
          >
            ↷
          </button>
          <button
            type="button"
            className="wb-btn"
            disabled={!hasSelection}
            onClick={() => void duplicateSelected()}
            title="Nhân đôi (Ctrl+D)"
          >
            Nhân đôi
          </button>
          <button
            type="button"
            className="wb-btn"
            disabled={!hasSelection}
            onClick={() => moveLayer("front")}
            title="Đưa lên trên"
          >
            Lên ↑
          </button>
          <button
            type="button"
            className="wb-btn"
            disabled={!hasSelection}
            onClick={() => moveLayer("back")}
            title="Đẩy xuống dưới"
          >
            Xuống ↓
          </button>
          <button
            type="button"
            className={`wb-btn ${showGrid ? "active" : ""}`}
            onClick={() => setShowGrid((v) => !v)}
            title="Bật/tắt lưới chấm"
          >
            Lưới
          </button>
          <button
            type="button"
            className="wb-btn"
            disabled={!hasSelection}
            onClick={deleteSelected}
          >
            Xoá
          </button>
          <button type="button" className="wb-btn danger" onClick={clearBoard}>
            Xoá hết
          </button>
          <button type="button" className="wb-btn" onClick={exportPng}>
            PNG
          </button>
          <span className="wb-status" title="Trạng thái đồng bộ realtime">
            <span className={`wb-dot ${isConnected ? "online" : ""}`} />
            {isConnected ? `Realtime · ${peerCount}` : "Đang kết nối…"}
          </span>
        </div>
      </div>

      <div ref={stageRef} className={`wb-stage ${showGrid ? "with-grid" : ""}`}>
        <canvas ref={canvasElRef} />
      </div>
    </div>
  );
}
