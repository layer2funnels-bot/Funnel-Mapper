import { CATCOLOR, NH, blockH, isAnnot, nodeW, typeOf } from "@/lib/catalog";
import { parseGraph } from "@/lib/graph";

/** Static mini map of a funnel graph (server-renderable). Used as the funnel thumbnail. */
export function GraphThumb({ graph, className = "" }: { graph: unknown; className?: string }) {
  let g;
  try {
    g = parseGraph(graph);
  } catch {
    g = { nodes: [], edges: [], view: { x: 0, y: 0, k: 1 } };
  }
  const nodes = g.nodes.filter((n) => typeOf(n.type));
  if (!nodes.length)
    return (
      <div className={`dotgrid grid place-items-center text-xs text-muted ${className}`} aria-hidden="true">
        Empty map
      </div>
    );
  const box = (n: (typeof nodes)[number]) => ({ w: n.w ?? nodeW(n.type), h: n.h ?? (n.type === "label" ? 40 : isAnnot(n.type) ? NH : blockH(n.type)) });
  const x0 = Math.min(...nodes.map((n) => n.x)) - 30,
    y0 = Math.min(...nodes.map((n) => n.y)) - 30,
    x1 = Math.max(...nodes.map((n) => n.x + box(n).w)) + 30,
    y1 = Math.max(...nodes.map((n) => n.y + box(n).h)) + 30;
  const B = Object.fromEntries(nodes.map((n) => [n.id, n]));
  return (
    <svg viewBox={`${x0} ${y0} ${x1 - x0} ${y1 - y0}`} className={`dotgrid ${className}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {nodes
        .filter((n) => n.type === "frame")
        .map((f) => (
          <rect key={f.id} x={f.x} y={f.y} width={f.w} height={f.h} rx={18} style={{ fill: String(f.p.color ?? "#10B981"), fillOpacity: 0.08, stroke: String(f.p.color ?? "#6D3FD9"), strokeWidth: 3, strokeDasharray: "10 8" }} />
        ))}
      {g.edges.map((e) => {
        const a = B[e.from],
          b = B[e.to];
        if (!a || !b) return null;
        const alt = e.port === "alt";
        const [sx, sy] = alt ? [a.x + nodeW(a.type) / 2, a.y + box(a).h] : [a.x + nodeW(a.type), a.y + box(a).h / 2];
        const [tx, ty] = [b.x, b.y + box(b).h / 2];
        const dx = Math.max(50, Math.abs(tx - sx) / 2);
        const c1 = alt ? [sx, sy + Math.max(60, Math.abs(ty - sy) / 2)] : [sx + dx, sy];
        return <path key={e.id} d={`M${sx} ${sy} C${c1[0]} ${c1[1]},${tx - dx} ${ty},${tx} ${ty}`} style={{ fill: "none", stroke: alt ? "var(--alt)" : "var(--edge)", strokeWidth: 5, strokeDasharray: alt ? "14 12" : undefined }} />;
      })}
      {nodes
        .filter((n) => n.type !== "frame")
        .map((n) => {
          const T = typeOf(n.type);
          if (n.type === "note") return <rect key={n.id} x={n.x} y={n.y} width={210} height={96} rx={14} style={{ fill: "#FEF3C7" }} />;
          if (n.type === "label") return <rect key={n.id} x={n.x} y={n.y + 8} width={180} height={18} rx={9} style={{ fill: "var(--muted)", opacity: 0.4 }} />;
          return (
            <g key={n.id}>
              <rect x={n.x} y={n.y} width={nodeW(n.type)} height={box(n).h} rx={14} style={{ fill: "var(--panel)", stroke: "var(--line)", strokeWidth: 3 }} />
              <rect x={n.x + 12} y={n.y + 12} width={32} height={32} rx={9} style={{ fill: CATCOLOR[T.color ?? T.cat] }} />
              <rect x={n.x + 54} y={n.y + 18} width={nodeW(n.type) - 80} height={12} rx={6} style={{ fill: "var(--ink)", opacity: 0.55 }} />
              <rect x={n.x + 12} y={n.y + box(n).h - 24} width={nodeW(n.type) - 60} height={10} rx={5} style={{ fill: "var(--muted)", opacity: 0.35 }} />
            </g>
          );
        })}
    </svg>
  );
}
