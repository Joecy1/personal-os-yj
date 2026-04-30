// Radial SVG renderer for world map mental models.
import type { CSSProperties } from "react";

export type MapNode = { id: string; label: string; type: "secondary" | "anchor" | "tension" | "peripheral"; description?: string };
export type MapConnection = { from: string; to: string; type: "supports" | "opposes" | "qualifies" | "undefined"; weight?: number };
export type MapData = {
  core: { label: string; description: string };
  nodes: MapNode[];
  connections: MapConnection[];
  tensions?: { between: string[]; description: string }[];
  blank_spaces?: { label: string; description: string }[];
  annotations?: { core_insight?: string; tension_insight?: string | null; blank_space_insight?: string | null };
};

const nodeStyles: Record<string, { fill: string; stroke: string; strokeWidth: number; textColor: string; rx: number; ry: number; opacity?: number }> = {
  core:       { fill: "#F0EEF9", stroke: "#5A44A8", strokeWidth: 1.5, textColor: "#5A44A8", rx: 65, ry: 27 },
  secondary:  { fill: "#EEE9DF", stroke: "#B8B4AE", strokeWidth: 1,   textColor: "#4A4640", rx: 50, ry: 20 },
  anchor:     { fill: "#FDF3E0", stroke: "#C8820A", strokeWidth: 1,   textColor: "#C8820A", rx: 52, ry: 20 },
  tension:    { fill: "#FBF0EC", stroke: "#B84A2E", strokeWidth: 1,   textColor: "#B84A2E", rx: 54, ry: 20 },
  peripheral: { fill: "#EEE9DF", stroke: "#B8B4AE", strokeWidth: 0.8, textColor: "#8A8480", rx: 38, ry: 17, opacity: 0.7 },
};

const connectionStyles: Record<string, { stroke: string; strokeWidth: number; strokeDasharray: string; opacity: number }> = {
  supports:  { stroke: "#B8B4AE", strokeWidth: 1,   strokeDasharray: "3 2", opacity: 0.6 },
  opposes:   { stroke: "#B84A2E", strokeWidth: 0.8, strokeDasharray: "4 3", opacity: 0.4 },
  qualifies: { stroke: "#B8B4AE", strokeWidth: 0.7, strokeDasharray: "2 4", opacity: 0.4 },
  undefined: { stroke: "#B8B4AE", strokeWidth: 0.8, strokeDasharray: "3 2", opacity: 0.5 },
};

function wrap(label: string): string[] {
  if (label.length <= 18) return [label];
  const words = label.split(/\s+/);
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

export function MapRenderer({ mapData, variant = "full", style }: { mapData: MapData; variant?: "full" | "compact"; style?: CSSProperties }) {
  if (!mapData?.core || !mapData?.nodes) return null;

  const compact = variant === "compact";
  const scale = compact ? 0.5 : 1;
  const cx = compact ? 130 : 260;
  const cy = compact ? 50 : 100;
  const vb = compact ? "0 0 260 100" : "0 0 520 200";
  const r1 = compact ? 50 : 90;
  const r2 = compact ? 90 : 160;

  const ring1 = mapData.nodes.filter((n) => n.type !== "peripheral");
  const ring2 = mapData.nodes.filter((n) => n.type === "peripheral");

  const positions = new Map<string, { x: number; y: number }>();
  positions.set("core", { x: cx, y: cy });

  ring1.forEach((n, i) => {
    const angle = (i / Math.max(ring1.length, 1)) * 2 * Math.PI - Math.PI / 2;
    const offset = n.type === "tension" ? 12 * scale : 0;
    positions.set(n.id, { x: cx + (r1 + offset) * Math.cos(angle), y: cy + (r1 + offset) * Math.sin(angle) });
  });
  ring2.forEach((n, i) => {
    const angle = (i / Math.max(ring2.length, 1)) * 2 * Math.PI + Math.PI / 4;
    positions.set(n.id, { x: cx + r2 * Math.cos(angle), y: cy + r2 * Math.sin(angle) });
  });

  const nodeFontSize = (type: string) => {
    if (compact) return type === "core" ? 7 : type === "peripheral" ? 6 : 6.5;
    return type === "core" ? 12 : type === "peripheral" ? 10 : 11;
  };

  return (
    <svg viewBox={vb} style={{ width: "100%", height: "auto", display: "block", ...style }}>
      {/* connections behind */}
      {mapData.connections.map((c, i) => {
        const fromKey = c.from === "core" ? "core" : c.from;
        const toKey = c.to;
        const from = positions.get(fromKey);
        const to = positions.get(toKey);
        if (!from || !to) return null;
        const s = connectionStyles[c.type] ?? connectionStyles.undefined;
        const isTension = c.type === "opposes";
        const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
        return (
          <g key={`c${i}`}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={s.stroke} strokeWidth={s.strokeWidth * (compact ? 0.7 : 1)} strokeDasharray={s.strokeDasharray} opacity={s.opacity} />
            {isTension && !compact && (
              <text x={mid.x} y={mid.y - 4} textAnchor="middle" fontFamily="DM Mono, monospace" fontSize={9} fill="#B84A2E" opacity={0.7}>tension</text>
            )}
          </g>
        );
      })}
      {/* core */}
      {(() => {
        const s = nodeStyles.core;
        const lines = wrap(mapData.core.label);
        return (
          <g>
            <ellipse cx={cx} cy={cy} rx={s.rx * scale} ry={s.ry * scale} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} />
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontFamily="DM Sans, sans-serif" fontSize={nodeFontSize("core")} fontWeight={500} fill={s.textColor}>
              {lines.length === 1 ? lines[0] : (
                <>
                  <tspan x={cx} dy={-6 * scale}>{lines[0]}</tspan>
                  <tspan x={cx} dy={12 * scale}>{lines[1]}</tspan>
                </>
              )}
            </text>
          </g>
        );
      })()}
      {/* other nodes */}
      {mapData.nodes.map((n) => {
        const p = positions.get(n.id);
        if (!p) return null;
        const s = nodeStyles[n.type] ?? nodeStyles.secondary;
        const lines = wrap(n.label);
        return (
          <g key={n.id} opacity={s.opacity ?? 1}>
            <ellipse cx={p.x} cy={p.y} rx={s.rx * scale} ry={s.ry * scale} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} />
            <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontFamily="DM Sans, sans-serif" fontSize={nodeFontSize(n.type)} fill={s.textColor}>
              {lines.length === 1 ? lines[0] : (
                <>
                  <tspan x={p.x} dy={-5 * scale}>{lines[0]}</tspan>
                  <tspan x={p.x} dy={10 * scale}>{lines[1]}</tspan>
                </>
              )}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
