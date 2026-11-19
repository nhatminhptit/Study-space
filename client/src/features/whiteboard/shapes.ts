import {
  Circle,
  Ellipse,
  FabricObject,
  IText,
  Line,
  Path,
  Polygon,
  Rect,
  Textbox,
  Triangle,
} from "fabric";

export type ShapeKind =
  | "rect"
  | "rounded-rect"
  | "circle"
  | "ellipse"
  | "triangle"
  | "diamond"
  | "hexagon"
  | "star"
  | "callout"
  | "line"
  | "arrow"
  | "double-arrow";

export type DashStyle = "solid" | "dashed" | "dotted";

export interface ShapeStyle {
  stroke: string;
  fill: string; // 'transparent' hoac ma hex
  strokeWidth: number;
  dash: DashStyle;
}

export interface ShapeCatalogItem {
  kind: ShapeKind;
  label: string;
  group: "basic" | "line";
  svgPath: string;
}

export const SHAPE_CATALOG: ShapeCatalogItem[] = [
  {
    kind: "rect",
    label: "Hình chữ nhật",
    group: "basic",
    svgPath: "M3 5h18v14H3z",
  },
  {
    kind: "rounded-rect",
    label: "Bo góc",
    group: "basic",
    svgPath:
      "M6 5h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z",
  },
  {
    kind: "circle",
    label: "Hình tròn",
    group: "basic",
    svgPath: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  },
  {
    kind: "ellipse",
    label: "Hình elip",
    group: "basic",
    svgPath: "M12 5c5.5 0 10 3.1 10 7s-4.5 7-10 7-10-3.1-10-7 4.5-7 10-7z",
  },
  {
    kind: "triangle",
    label: "Tam giác",
    group: "basic",
    svgPath: "M12 4l9 16H3z",
  },
  {
    kind: "diamond",
    label: "Hình thoi",
    group: "basic",
    svgPath: "M12 3l9 9-9 9-9-9z",
  },
  {
    kind: "hexagon",
    label: "Lục giác",
    group: "basic",
    svgPath: "M7 4h10l5 8-5 8H7l-5-8z",
  },
  {
    kind: "star",
    label: "Ngôi sao",
    group: "basic",
    svgPath:
      "M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8-5.1-4.7 6.9-.8z",
  },
  {
    kind: "callout",
    label: "Hội thoại",
    group: "basic",
    svgPath:
      "M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  },
  { kind: "line", label: "Đường thẳng", group: "line", svgPath: "M4 20L20 4" },
  {
    kind: "arrow",
    label: "Mũi tên",
    group: "line",
    svgPath: "M4 12h16m-5-5l5 5-5 5",
  },
  {
    kind: "double-arrow",
    label: "Mũi tên 2 chiều",
    group: "line",
    svgPath: "M4 12h16M9 7l-5 5 5 5m6-10l5 5-5 5",
  },
];

export function getDashArray(style: DashStyle): number[] | null {
  if (style === "dashed") return [10, 6];
  if (style === "dotted") return [2, 6];
  return null;
}

export function detectDashStyle(dash: number[] | null | undefined): DashStyle {
  if (!Array.isArray(dash) || dash.length === 0) return "solid";
  return dash[0] <= 4 ? "dotted" : "dashed";
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return `rgba(250, 204, 21, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function makeRegularPolygonPoints(sides: number, radius: number) {
  return Array.from({ length: sides }, (_, i) => {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    return {
      x: radius + radius * Math.cos(angle),
      y: radius + radius * Math.sin(angle),
    };
  });
}

function makeStarPoints(points: number, outerR: number, innerR: number) {
  const total = points * 2;
  return Array.from({ length: total }, (_, i) => {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    return {
      x: outerR + r * Math.cos(angle),
      y: outerR + r * Math.sin(angle),
    };
  });
}

export function createShapeObject(
  kind: ShapeKind,
  style: ShapeStyle,
  offset = 0,
): FabricObject {
  const left = 110 + offset;
  const top = 90 + offset;
  const common = {
    left,
    top,
    fill: style.fill === "transparent" ? "transparent" : style.fill,
    stroke: style.stroke,
    strokeWidth: Math.max(2, style.strokeWidth),
    strokeDashArray: getDashArray(style.dash),
    strokeUniform: true,
    strokeLineCap: "round" as const,
    strokeLineJoin: "round" as const,
  };

  switch (kind) {
    case "rect":
      return new Rect({ ...common, width: 150, height: 96 });
    case "rounded-rect":
      return new Rect({ ...common, width: 150, height: 96, rx: 16, ry: 16 });
    case "circle":
      return new Circle({ ...common, radius: 52 });
    case "ellipse":
      return new Ellipse({ ...common, rx: 78, ry: 46 });
    case "triangle":
      return new Triangle({ ...common, width: 120, height: 105 });
    case "diamond":
      return new Polygon(
        [
          { x: 65, y: 0 },
          { x: 130, y: 52 },
          { x: 65, y: 104 },
          { x: 0, y: 52 },
        ],
        common,
      );
    case "hexagon":
      return new Polygon(makeRegularPolygonPoints(6, 56), common);
    case "star":
      return new Polygon(makeStarPoints(5, 58, 25), common);
    case "callout":
      return new Path(
        "M 14 0 H 156 Q 170 0 170 14 V 78 Q 170 92 156 92 H 60 L 28 118 L 38 92 H 14 Q 0 92 0 78 V 14 Q 0 0 14 0 Z",
        common,
      );
    case "line":
      return new Line([left, top + 40, left + 160, top + 40], {
        stroke: style.stroke,
        strokeWidth: Math.max(2, style.strokeWidth),
        strokeDashArray: getDashArray(style.dash),
        strokeUniform: true,
        strokeLineCap: "round",
      });
    case "arrow":
      return new Path("M 0 14 L 146 14 M 132 0 L 148 14 L 132 28", {
        ...common,
        fill: "",
      });
    case "double-arrow":
      return new Path(
        "M 16 0 L 0 14 L 16 28 M 2 14 L 154 14 M 140 0 L 156 14 L 140 28",
        {
          ...common,
          fill: "",
        },
      );
  }
}

export function createTextObject(color: string, offset = 0): IText {
  return new IText("Nhập văn bản...", {
    left: 120 + offset,
    top: 100 + offset,
    fill: color,
    fontSize: 22,
    fontFamily: "system-ui, -apple-system, sans-serif",
  });
}

export function createStickyNoteObject(offset = 0): Textbox {
  return new Textbox("Ghi chú học tập...", {
    left: 140 + offset,
    top: 110 + offset,
    width: 190,
    fontSize: 16,
    fontFamily: "system-ui, -apple-system, sans-serif",
    fill: "#1e293b",
    backgroundColor: "#fef08a",
    padding: 12,
  });
}
