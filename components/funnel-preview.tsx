// Live funnel preview (V2 F2): an SVG drawn from the funnel's saved canvas by ONE renderer (lib/funnel-preview.ts).
// Server-renderable (no hooks), themed through CSS variables, so Dark and Light both work. Stores no image.
import { CATCOLOR, type ColorKey } from "@/lib/catalog";
import { FAMILY_GEOM, WF_SIZE, WIREFRAMES } from "@/lib/block-visuals";
import { previewModel, type PreviewNode } from "@/lib/funnel-preview";

const r2 = (v: number) => Math.round(v * 100) / 100;

function Mini({ n, windows, names, shapes }: { n: PreviewNode; windows: boolean; names: boolean; shapes: boolean }) {
  const c = CATCOLOR[n.color as ColorKey] ?? "var(--muted)";
  const G = FAMILY_GEOM[n.family];
  const r = n.family === "page" || n.family === "offer" ? 12 : n.family === "logic" ? 6 : n.family === "source" || n.family === "message" || n.family === "goal" ? n.h / 2 : 14;
  if (shapes || !windows)
    return (
      <g transform={`translate(${n.x} ${n.y})`}>
        <rect width={n.w} height={n.h} rx={r} style={{ fill: c, opacity: 0.9 }} />
        {(n.family === "page" || n.family === "offer") && <rect x={10} y={10} width={n.w - 20} height={30} rx={6} style={{ fill: "var(--panel)", opacity: 0.85 }} />}
      </g>
    );
  const strip = n.family === "page" || n.family === "offer";
  const headY = strip ? 46 : 0;
  const tileCy = headY + 37;
  return (
    <g transform={`translate(${n.x} ${n.y})`}>
      <rect width={n.w} height={n.h} rx={r} style={{ fill: "var(--chrome)", stroke: "var(--line)", strokeWidth: 2 }} />
      {strip && (
        <>
          <rect x={8} y={8} width={n.w - 16} height={32} rx={5} style={{ fill: "var(--panel2)", stroke: "var(--line)", strokeWidth: 1.5 }} />
          <svg x={12} y={9} width={n.w - 24} height={30} viewBox={`0 0 ${WF_SIZE.w} ${WF_SIZE.h}`} preserveAspectRatio="xMidYMid meet">
            {(WIREFRAMES[n.wireframe ?? "sales"] ?? []).map((s, i) =>
              s[0] === "r" ? (
                <rect key={i} x={s[1]} y={s[2]} width={s[3]} height={s[4]} rx={s[5]} style={s[6] === "o" ? { fill: "none", stroke: "var(--line)" } : s[6] === "a" ? { fill: c } : s[6] === "ao" ? { fill: "none", stroke: c } : { fill: s[6] === "m" ? "var(--edge)" : "var(--line)" }} />
              ) : s[0] === "c" ? (
                <circle key={i} cx={s[1]} cy={s[2]} r={s[3]} style={s[4] === "o" ? { fill: "none", stroke: "var(--line)" } : s[4] === "a" ? { fill: c } : { fill: "none", stroke: c }} />
              ) : (
                <path key={i} d={s[1]} style={{ fill: s[2] === "a" ? c : "none", stroke: s[2] === "ao" ? c : "none", strokeWidth: 1.5 }} />
              ),
            )}
          </svg>
        </>
      )}
      {n.family === "action" ? (
        <rect x={G.pad[0] + 2} y={tileCy - 14} width={28} height={28} rx={7} transform={`rotate(45 ${G.pad[0] + 16} ${tileCy})`} style={{ fill: c }} />
      ) : G.tile === "circle" ? (
        <circle cx={G.pad[0] + 16} cy={tileCy} r={16} style={{ fill: c }} />
      ) : (
        <rect x={G.pad[0]} y={tileCy - 16} width={32} height={32} rx={G.tileR} style={{ fill: c }} />
      )}
      {names ? (
        <text x={G.pad[0] + 44} y={tileCy + 5} style={{ fill: "var(--ink)", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: 15, fontWeight: 600 }}>
          {n.name.length > 18 ? `${n.name.slice(0, 17)}…` : n.name}
        </text>
      ) : (
        <>
          <rect x={G.pad[0] + 44} y={tileCy - 12} width={n.w - G.pad[0] - 64} height={9} rx={4} style={{ fill: "var(--ink)", opacity: 0.7 }} />
          <rect x={G.pad[0] + 44} y={tileCy + 4} width={56} height={7} rx={3} style={{ fill: "var(--muted)", opacity: 0.6 }} />
        </>
      )}
      {n.price && <rect x={12} y={-10} width={52} height={20} rx={5} style={{ fill: "var(--bg)", stroke: c, strokeWidth: 2 }} />}
    </g>
  );
}

/**
 * Preview of a funnel's map. `pad` is 8px on cards and 4px in tables. `archived` draws it at 50%. The whole card that
 * holds it is the link to the map; the preview itself is an image with a text alternative.
 */
export function FunnelPreview({ graph, settings, name, width = 320, height = 150, pad = 8, archived = false, className = "" }: { graph: unknown; settings?: unknown; name?: string; width?: number; height?: number; pad?: number; archived?: boolean; className?: string }) {
  const m = previewModel(graph, settings ?? {}, width, height, pad, name);
  const small = height < 100;
  return (
    <svg className={`fm-fprev ${className}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={m.empty ? `Map of ${name ?? "this funnel"}: no blocks yet` : m.label} style={archived ? { opacity: 0.5 } : undefined}>
      <defs>
        <pattern id={`fpd-${width}-${height}`} width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".8" style={{ fill: "var(--dot)" }} />
        </pattern>
      </defs>
      <rect width={width} height={height} style={{ fill: "var(--bg)" }} />
      <rect width={width} height={height} fill={`url(#fpd-${width}-${height})`} />
      {m.empty ? (
        <g>
          <rect x={width / 2 - 34} y={height / 2 - (small ? 24 : 44)} width={68} height={40} rx={8} style={{ fill: "none", stroke: "var(--edge)", strokeWidth: 1.4, strokeDasharray: "4 4" }} />
          {!small && (
            <>
              <text x={width / 2} y={height / 2 + 16} textAnchor="middle" style={{ fill: "var(--ink)", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-dm-sans), sans-serif" }}>
                No blocks yet
              </text>
              <text x={width / 2} y={height / 2 + 31} textAnchor="middle" style={{ fill: "var(--muted)", fontSize: 10.5, fontFamily: "var(--font-dm-sans), sans-serif" }}>
                Add a traffic source to start
              </text>
            </>
          )}
        </g>
      ) : (
        <g transform={`translate(${r2(m.tx)} ${r2(m.ty)}) scale(${r2(m.scale * 10000) / 10000})`}>
          {m.frames.map((f, i) => (
            <rect key={i} x={f.x} y={f.y} width={f.w} height={f.h} rx={14} style={{ fill: f.color, fillOpacity: 0.05, stroke: "var(--line)", strokeWidth: 2 / m.scale > 6 ? 6 : 2, strokeDasharray: "10 8" }} />
          ))}
          {m.edges.map((e) => (
            <path
              key={e.id}
              d={e.d}
              style={{
                fill: "none",
                stroke: e.kind === "leak" ? "var(--lost)" : e.kind === "nodata" ? "var(--muted)" : "var(--edge)",
                strokeWidth: e.width,
                strokeLinecap: "round",
                strokeDasharray: e.kind === "leak" ? `${4 / m.scale} ${3 / m.scale}` : e.kind === "skip" ? `${1.5 / m.scale} ${3 / m.scale}` : e.kind === "nodata" ? `${6 / m.scale} ${3 / m.scale} ${1.5 / m.scale} ${3 / m.scale}` : undefined,
              }}
            />
          ))}
          {m.nodes.map((n) => (
            <Mini key={n.id} n={n} windows={m.windows} names={m.names} shapes={m.detail !== "full"} />
          ))}
          {m.leakId &&
            m.nodes
              .filter((n) => n.id === m.leakId)
              .map((n) => <rect key="leak" x={n.x - 10} y={n.y - 10} width={n.w + 20} height={n.h + 20} rx={16} style={{ fill: "none", stroke: "var(--lost)", strokeWidth: Math.max(3, 1.6 / m.scale), strokeDasharray: `${Math.max(14, 6 / m.scale)} ${Math.max(8, 4 / m.scale)}` }} />)}
        </g>
      )}
    </svg>
  );
}
