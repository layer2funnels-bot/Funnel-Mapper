"use client";
import { EdgeLabelRenderer, getSmoothStepPath, getStraightPath, Position, type EdgeProps } from "@xyflow/react";
import { memo } from "react";
import { nf } from "@/lib/format";
import { num } from "@/lib/funnel-math";
import { curve, edgeTag } from "@/lib/editor/labels";
import { selectEdge, useEditor } from "@/lib/editor/store";
import { DASH, edgeLook, type EdgeStyle } from "@/lib/style";

type Data = { port: "main" | "alt"; fromType?: string; share: number; s?: EdgeStyle };

/** Path + label point for the connection's line style (curved is the prototype's own bezier). */
function edgePath(look: ReturnType<typeof edgeLook>, port: "main" | "alt", sx: number, sy: number, tx: number, ty: number): [string, number, number] {
  if (look.path === "straight") {
    const [d, lx, ly] = getStraightPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty });
    return [d, lx, ly];
  }
  if (look.path === "elbow") {
    const [d, lx, ly] = getSmoothStepPath({ sourceX: sx, sourceY: sy, sourcePosition: port === "alt" ? Position.Bottom : Position.Right, targetX: tx, targetY: ty, targetPosition: Position.Left, borderRadius: 10 });
    return [d, lx, ly];
  }
  const [d, [mx, my]] = curve(sx, sy, port, tx, ty);
  return [d, mx, my];
}

export const FlowEdge = memo(function FlowEdge({ id, sourceX, sourceY, targetX, targetY, selected, data }: EdgeProps & { data: Data }) {
  const flow = useEditor((s) => s.R.flows[id] ?? 0);
  const maxF = useEditor((s) => Math.max(1, ...Object.values(s.R.flows)));
  const thick = useEditor((s) => s.opts.thick);
  const port = data?.port ?? "main";
  const look = edgeLook(data?.s);
  const [d, mx, my] = edgePath(look, port, sourceX, sourceY, targetX, targetY);
  const w = look.width ?? (thick ? 2 + 6 * Math.sqrt(flow / maxF) : 2);
  const tag = edgeTag(data?.fromType, port);
  const share = num(data?.share ?? 100);
  const marker = look.arrow !== "none" ? `fm-arrow-${id}` : null;
  const style: React.CSSProperties = { strokeWidth: w, ...(look.color && !selected ? { stroke: look.color } : {}), ...(look.dash ? { strokeDasharray: DASH[look.dash] ?? "none" } : {}) };
  return (
    <>
      {marker && (
        <defs>
          <marker id={marker} viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth={look.arrowSize + w * 1.5} markerHeight={look.arrowSize + w * 1.5} orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" className={`fm-arrowhead${port === "alt" ? " alt" : ""}`} style={look.color ? { fill: look.color } : undefined} />
          </marker>
        </defs>
      )}
      <path
        className={`fm-edge${port === "alt" ? " alt" : ""}${selected ? " sel" : ""}${look.kind !== "flow" ? ` ${look.kind}` : ""}`}
        d={d}
        style={style}
        markerEnd={marker ? `url(#${marker})` : undefined}
        markerStart={marker && look.arrow === "both" ? `url(#${marker})` : undefined}
      />
      <path className="react-flow__edge-interaction" d={d} fill="none" strokeOpacity={0} strokeWidth={16} />
      <EdgeLabelRenderer>
        <button
          type="button"
          className={`fm-elabel nodrag nopan${selected ? " sel" : ""}${look.kind === "nodata" ? " nodata" : ""}`}
          style={{ left: mx, top: my }}
          onClick={() => selectEdge(id)}
          aria-label={look.kind === "nodata" ? "Connection without data" : `Connection carrying ${nf(flow)} people`}
        >
          {tag && <span className={`tag${tag.alt ? " alt" : ""}`}>{tag.text}</span>}
          {look.kind === "skip" && <span className="tag">Skip</span>}
          {look.label && <span className="tag">{look.label}</span>}
          {look.kind === "nodata" ? (
            <span className="n">No data</span>
          ) : (
            <span className="n">
              {nf(flow)}
              {share !== 100 ? ` · ${nf(share)}%` : ""}
            </span>
          )}
        </button>
      </EdgeLabelRenderer>
    </>
  );
});

export const edgeTypes = { flow: FlowEdge };
