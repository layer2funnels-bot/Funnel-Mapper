"use client";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { Icon } from "@/components/icon";
import { CATCOLOR, portsFor, typeOf } from "@/lib/catalog";
import { moveNodes, useEditor } from "@/lib/editor/store";
import { nodeStats, subLabel } from "@/lib/editor/labels";

type P = NodeProps & { data: { id: string } };

const useNode = (id: string) => useEditor((s) => s.nodes.find((n) => n.id === id));

export const BlockNode = memo(function BlockNode({ id, selected }: P) {
  const n = useNode(id);
  const R = useEditor((s) => s.R);
  const cur = useEditor((s) => s.settings.currency);
  const warn = useEditor((s) => !s.shared && s.warnIds.has(id));
  const spot = useEditor((s) => s.spot);
  if (!n) return null;
  const T = typeOf(n.type);
  const { hasIn, hasOut, hasAlt, labels } = portsFor(n.type);
  const logic = T.cat === "logic";
  const cc = CATCOLOR[T.color ?? T.cat];
  const stats = nodeStats(n, R, cur);
  const cls = ["fm-node", logic && "logic", selected && "sel", warn && "warn", spot && (spot === id ? "spot" : "dim")].filter(Boolean).join(" ");
  return (
    <div className={cls} style={{ ["--cc" as string]: cc }} aria-label={`${T.label}: ${n.name}`}>
      {hasIn && <Handle type="target" position={Position.Left} id="in" className="fm-port in" />}
      <div className="fm-nhead">
        <span className="fm-nicon">
          <Icon name={T.icon} />
        </span>
        <div className="fm-ntitle">
          <span>{n.name}</span>
          <small>{subLabel(n, cur)}</small>
        </div>
      </div>
      <div className="fm-nstats">
        {stats.map((s, i) => (s.b ? <b key={i}>{s.t}</b> : <span key={i}>{s.t}</span>))}
      </div>
      {hasOut && <Handle type="source" position={Position.Right} id="main" className="fm-port out" title={`${labels ? labels[0] : "Converted"}: drag to connect`} />}
      {hasAlt && <Handle type="source" position={Position.Bottom} id="alt" className="fm-port alt" title={`${labels ? labels[1] : "Didn’t convert"}: drag to connect`} />}
      {labels && <span className="fm-plabel out">{labels[0]}</span>}
    </div>
  );
});

export const NoteNode = memo(function NoteNode({ id, selected }: P) {
  const n = useNode(id);
  if (!n) return null;
  return (
    <div className={`fm-node note${selected ? " sel" : ""}`} aria-label="Sticky note">
      <div className="ntext">{String(n.p.text ?? "")}</div>
    </div>
  );
});

export const LabelNode = memo(function LabelNode({ id, selected }: P) {
  const n = useNode(id);
  if (!n) return null;
  return (
    <div className={`fm-node label${selected ? " sel" : ""}`} aria-label="Heading">
      <div className="ntext" style={{ fontSize: Number(n.p.size) || 28 }}>
        {String(n.p.text ?? "")}
      </div>
    </div>
  );
});

export const FrameNode = memo(function FrameNode({ id, selected }: P) {
  const n = useNode(id);
  const readOnly = useEditor((s) => s.readOnly);
  if (!n) return null;
  return (
    <>
      <NodeResizer
        isVisible={selected && !readOnly}
        minWidth={160}
        minHeight={100}
        lineStyle={{ borderColor: "transparent" }}
        onResizeEnd={(_, p) => moveNodes({ [id]: { x: Math.round(p.x), y: Math.round(p.y), w: Math.round(p.width), h: Math.round(p.height) } })}
      />
      <div className={`fm-frame${selected ? " sel" : ""}`} style={{ ["--fc" as string]: String(n.p.color ?? "#6D3FD9") }} aria-label={`Stage frame: ${n.name}`}>
        <span className="ftitle">{n.name}</span>
      </div>
    </>
  );
});

export const nodeTypes = { block: BlockNode, note: NoteNode, label: LabelNode, frame: FrameNode };
