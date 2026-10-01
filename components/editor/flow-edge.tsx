"use client";
import { EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import { memo } from "react";
import { nf } from "@/lib/format";
import { num } from "@/lib/funnel-math";
import { curve, edgeTag } from "@/lib/editor/labels";
import { selectEdge, useEditor } from "@/lib/editor/store";

type Data = { port: "main" | "alt"; fromType?: string; share: number };

export const FlowEdge = memo(function FlowEdge({ id, sourceX, sourceY, targetX, targetY, selected, data }: EdgeProps & { data: Data }) {
  const flow = useEditor((s) => s.R.flows[id] ?? 0);
  const maxF = useEditor((s) => Math.max(1, ...Object.values(s.R.flows)));
  const thick = useEditor((s) => s.opts.thick);
  const port = data?.port ?? "main";
  // React Flow reports the handle's outer edge; offset 1px like the prototype's portXY()
  const [d, [mx, my]] = curve(sourceX, sourceY, port, targetX, targetY);
  const w = thick ? 2 + 6 * Math.sqrt(flow / maxF) : 2;
  const tag = edgeTag(data?.fromType, port);
  const share = num(data?.share ?? 100);
  return (
    <>
      <path className={`fm-edge${port === "alt" ? " alt" : ""}${selected ? " sel" : ""}`} d={d} style={{ strokeWidth: w }} />
      <path className="react-flow__edge-interaction" d={d} fill="none" strokeOpacity={0} strokeWidth={16} />
      <EdgeLabelRenderer>
        <button
          type="button"
          className={`fm-elabel nodrag nopan${selected ? " sel" : ""}`}
          style={{ left: mx, top: my }}
          onClick={() => selectEdge(id)}
          aria-label={`Connection carrying ${nf(flow)} people`}
        >
          {tag && <span className={`tag${tag.alt ? " alt" : ""}`}>{tag.text}</span>}
          <span className="n">
            {nf(flow)}
            {share !== 100 ? ` · ${nf(share)}%` : ""}
          </span>
        </button>
      </EdgeLabelRenderer>
    </>
  );
});

export const edgeTypes = { flow: FlowEdge };
