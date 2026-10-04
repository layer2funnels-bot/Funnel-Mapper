"use client";
import { EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import { memo } from "react";
import { money, nf } from "@/lib/format";
import { num, periodFactor } from "@/lib/funnel-math";
import { edgeConversion, edgePath, edgeRevenue, edgeTag } from "@/lib/editor/labels";
import { selectEdge, useEditor } from "@/lib/editor/store";
import { DASH, edgeLook, type EdgeStyle } from "@/lib/style";

type Data = { port: "main" | "alt"; fromType?: string; from?: string; to?: string; share: number; s?: EdgeStyle };

export const FlowEdge = memo(function FlowEdge({ id, sourceX, sourceY, targetX, targetY, selected, data }: EdgeProps & { data: Data }) {
  const flow0 = useEditor((s) => s.R.flows[id] ?? 0);
  const k = useEditor((s) => periodFactor(s.opts.period));
  const flow = flow0 * k;
  const maxF = useEditor((s) => Math.max(1, ...Object.values(s.R.flows)));
  const thick = useEditor((s) => s.opts.thick);
  const cur = useEditor((s) => s.settings.currency);
  const R = useEditor((s) => s.R);
  const port = data?.port ?? "main";
  const look = edgeLook(data?.s);
  const [d, mx, my] = edgePath(look, port, sourceX, sourceY, targetX, targetY);
  const w = look.width ?? (thick ? 2 + 6 * Math.sqrt(flow0 / maxF) : 2);
  const tag = edgeTag(data?.fromType, port);
  const share = num(data?.share ?? 100);
  const marker = look.arrow !== "none" ? `fm-arrow-${id}` : null;
  const style: React.CSSProperties = { strokeWidth: w, ...(look.opacity != null ? { opacity: look.opacity } : {}), ...(look.color && !selected ? { stroke: look.color } : {}), ...(look.dash ? { strokeDasharray: DASH[look.dash] ?? "none" } : {}) };
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
          data-edge={id}
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
          {look.kind !== "nodata" && look.showPct && data?.from && edgeConversion(data.from, flow0, R) != null && <span className="n pct"> · {nf(edgeConversion(data.from, flow0, R)! * 100, 1)}% convert</span>}
          {look.kind !== "nodata" && look.showRev && data?.to && edgeRevenue(data.to, flow0, R) > 0 && <span className="n rev"> · {money(edgeRevenue(data.to, flow0, R) * k, cur)}</span>}
        </button>
      </EdgeLabelRenderer>
    </>
  );
});

export const edgeTypes = { flow: FlowEdge };
