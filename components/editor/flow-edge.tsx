"use client";
import { EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import { memo } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { money, nf } from "@/lib/format";
import { num, periodFactor } from "@/lib/funnel-math";
import { dotSeconds, edgeDelta, flowDots } from "@/lib/simulate";
import { edgeConversion, edgePath, edgeRevenue, edgeTag } from "@/lib/editor/labels";
import { selectEdge, shownR, useEditor } from "@/lib/editor/store";
import { DASH, edgeLook, type EdgeStyle } from "@/lib/style";
import type { Side } from "@/lib/graph";

type Data = { port: "main" | "alt"; fromType?: string; from?: string; to?: string; share: number; s?: EdgeStyle };

export const FlowEdge = memo(function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected, data }: EdgeProps & { data: Data }) {
  const flow0 = useEditor((s) => shownR(s).flows[id] ?? 0);
  const k = useEditor((s) => periodFactor(s.opts.period));
  const flow = flow0 * k;
  const simBase = useEditor((s) => s.simBase);
  // while simulating, line weight is on one scale for "now" and "before", so a thicker or thinner line is a real change
  const maxF = useEditor((s) => Math.max(1, ...Object.values(s.R.flows), ...(s.simBase ? Object.values(s.simBase.R.flows) : [])));
  // people-flow dots: paused while dragging or panning
  const play = useEditor((s) => s.simPlay && !!s.simBase && !s.dragging);
  const speed = useEditor((s) => s.simSpeed);
  const before = useEditor((s) => s.simBefore);
  // at most 8 dots a line keeps the whole map under ~300 dots; busy maps get 3 a line
  const crowded = useEditor((s) => s.edges.length > 37);
  const calm = useReducedMotion();
  const thick = useEditor((s) => s.opts.thick);
  const cur = useEditor((s) => s.settings.currency);
  const R = useEditor(shownR);
  const port = data?.port ?? "main";
  const look = edgeLook(data?.s);
  const [d, mx, my] = edgePath(look, port, sourceX, sourceY, targetX, targetY, sourcePosition as Side, targetPosition as Side);
  const wOf = (f: number) => look.width ?? (thick ? 2 + 6 * Math.sqrt(f / maxF) : 2);
  const w = wOf(flow0);
  const ed = simBase && thick && !before ? edgeDelta(id, R, simBase.R) : null;
  const moved = ed && ed.was != null && ed.delta !== 0 ? (ed.delta > 0 ? "up" : "down") : null;
  const tag = edgeTag(data?.fromType, port);
  const share = num(data?.share ?? 100);
  const dots = play && !calm && look.kind !== "nodata" ? flowDots(flow0, maxF, crowded) : 0;
  const dur = dotSeconds(Math.hypot(targetX - sourceX, targetY - sourceY) * 1.15) / speed;
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
      {moved && ed && <path className="fm-edge-ghost" d={d} style={{ strokeWidth: wOf(ed.was!) + 3 }} aria-hidden="true" />}
      <path
        className={`fm-edge${port === "alt" ? " alt" : ""}${selected ? " sel" : ""}${look.kind !== "flow" ? ` ${look.kind}` : ""}${moved ? ` sim-${moved}` : ""}`}
        d={d}
        style={style}
        markerEnd={marker ? `url(#${marker})` : undefined}
        markerStart={marker && look.arrow === "both" ? `url(#${marker})` : undefined}
      />
      {dots > 0 && (
        <g className={`fm-flowdots${port === "alt" ? " alt" : ""}`} aria-hidden="true">
          {Array.from({ length: dots }, (_, k) => (
            <circle key={k} r={port === "alt" ? 2.6 : 3}>
              <animateMotion dur={`${dur}s`} begin={`-${((k / dots) * dur).toFixed(3)}s`} repeatCount="indefinite" path={d} />
            </circle>
          ))}
        </g>
      )}
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
              {moved && ed && (
                <span className={`sd ${moved}`}>
                  {" "}
                  {ed.delta > 0 ? "+" : "−"}
                  {nf(Math.abs(ed.delta) * k)}
                </span>
              )}
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
