"use client";
import { Handle, NodeResizeControl, NodeResizer, Position, ResizeControlVariant, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { Icon } from "@/components/icon";
import { baseOf, CATCOLOR, portsFor, typeOf } from "@/lib/catalog";
import { FAMILIES, hasSplitBar, visualOf } from "@/lib/block-visuals";
import { offerSubtitle, priceTab, SplitBar, StatusDot, WireframeStrip } from "./block-visual";
import type { ChecklistItem, FunnelNode } from "@/lib/graph";
import type { IconName } from "@/lib/icons";
import { checklistOf, moveNodes, setChecklist, useEditor } from "@/lib/editor/store";
import { nodeStats, subLabel } from "@/lib/editor/labels";
import { periodFactor } from "@/lib/funnel-math";
import { boxCss, shapeGeom, textCss } from "@/lib/style";
import { hostOf, isVideoUrl } from "@/lib/rich-text";
import { RichText } from "@/components/rich-text";

type P = NodeProps & { data: { id: string } };

const useNode = (id: string) => useEditor((s) => s.nodes.find((n) => n.id === id));
const useEditable = (n: FunnelNode | undefined) => useEditor((s) => !s.readOnly && !!n && !n.locked);

function LockBadge({ n }: { n: FunnelNode }) {
  if (!n.locked) return null;
  return (
    <span className="fm-lock" title="Locked" aria-hidden="true">
      <Icon name="lock" size={12} />
    </span>
  );
}

/** Full resize handles (shapes, images, frames). */
function Resizer({ n, selected, minW = 40, minH = 30 }: { n: FunnelNode; selected: boolean; minW?: number; minH?: number }) {
  const editable = useEditable(n);
  return (
    <NodeResizer
      isVisible={selected && editable}
      minWidth={minW}
      minHeight={minH}
      lineStyle={{ borderColor: "transparent" }}
      onResizeEnd={(_, p) => moveNodes({ [n.id]: { x: Math.round(p.x), y: Math.round(p.y), w: Math.round(p.width), h: Math.round(p.height) } }, { discrete: true })}
    />
  );
}

/** Width-only handle (text, notes, checklists: their height follows the content). */
function WidthResizer({ n, selected, minW = 80 }: { n: FunnelNode; selected: boolean; minW?: number }) {
  const editable = useEditable(n);
  if (!selected || !editable) return null;
  return (
    <NodeResizeControl
      position="right"
      variant={ResizeControlVariant.Line}
      minWidth={minW}
      style={{ borderColor: "transparent", borderWidth: 6 }}
      onResizeEnd={(_, p) => moveNodes({ [n.id]: { x: Math.round(p.x), y: Math.round(p.y), w: Math.round(p.width) } }, { discrete: true })}
    />
  );
}

export const BlockNode = memo(function BlockNode({ id, selected }: P) {
  const n = useNode(id);
  const R = useEditor((s) => s.R);
  const cur = useEditor((s) => s.settings.currency);
  const warn = useEditor((s) => !s.shared && s.warnIds.has(id));
  const spot = useEditor((s) => s.spot);
  const period = useEditor((s) => s.opts.period);
  const shared = useEditor((s) => s.shared);
  if (!n) return null;
  const T = typeOf(n.type);
  const { hasIn, hasOut, hasAlt, labels } = portsFor(n.type);
  const logic = T.cat === "logic";
  const cc = CATCOLOR[T.color ?? T.cat];
  const V = visualOf(n.type),
    F = FAMILIES[V.family];
  const stats = nodeStats(n, R, cur, periodFactor(period));
  const internal = !shared && !!n.desc?.trim();
  const tasks = n.checklist ?? [];
  const cls = ["fm-node", `fam-${V.family}`, logic && "logic", V.brand && "brand", selected && "sel", warn && "warn", spot && (spot === id ? "spot" : "dim")].filter(Boolean).join(" ");
  return (
    <div className={cls} style={{ ["--cc" as string]: cc, ...(V.brand ? { ["--tile" as string]: V.brand } : null), ...boxCss(n.s) }} aria-label={`${T.label}: ${n.name}`}>
      {hasIn && <Handle type="target" position={Position.Left} id="in" className="fm-port in" />}
      <LockBadge n={n} />
      {F.strip && V.wireframe && <WireframeStrip kind={V.wireframe} accent={cc} />}
      {F.price && <span className="fm-price">{priceTab(n, cur)}</span>}
      {!shared && <StatusDot status={n.status} />}
      <div className="fm-nhead">
        <span className="fm-nicon">
          <Icon name={(n.s?.icon as IconName) || T.icon} />
        </span>
        <div className="fm-ntitle">
          <span style={textCss(n.s)}>{n.name}</span>
          <small>{V.family === "offer" ? offerSubtitle(n) : subLabel(n, cur)}</small>
        </div>
      </div>
      {hasSplitBar(n.type) && <SplitBar pct={Number(n.p.pct) || 0} test={baseOf(n.type) === "split"} />}
      <div className="fm-nstats">
        {stats.map((s, i) => (s.b ? <b key={i}>{s.t}</b> : <span key={i}>{s.t}</span>))}
        {internal && (
          <span className="fm-nnote" title="Has internal notes (Plan tab)">
            <Icon name="note" size={11} />
          </span>
        )}
        {tasks.length > 0 && (
          <span className="fm-ntasks" title="Checklist">
            ✓ {tasks.filter((t) => t.done).length}/{tasks.length}
          </span>
        )}
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
    <>
      <WidthResizer n={n} selected={selected} minW={120} />
      <div className={`fm-node note${selected ? " sel" : ""}`} style={{ ...(n.w ? { width: n.w } : {}), ...boxCss(n.s) }} aria-label="Sticky note">
        <LockBadge n={n} />
        <RichText className="ntext rich" style={textCss(n.s)} text={String(n.p.text ?? "")} />
      </div>
    </>
  );
});

export const LabelNode = memo(function LabelNode({ id, selected }: P) {
  const n = useNode(id);
  if (!n) return null;
  return (
    <>
      <WidthResizer n={n} selected={selected} />
      <div className={`fm-node label${selected ? " sel" : ""}${n.w ? " fixed" : ""}`} style={{ ...(n.w ? { width: n.w } : {}), ...boxCss(n.s) }} aria-label="Heading">
        <LockBadge n={n} />
        <div className="ntext" style={textCss(n.s, Number(n.p.size) || 28)}>
          {String(n.p.text ?? "")}
        </div>
      </div>
    </>
  );
});

export const FrameNode = memo(function FrameNode({ id, selected }: P) {
  const n = useNode(id);
  if (!n) return null;
  return (
    <>
      <Resizer n={n} selected={selected} minW={160} minH={100} />
      <div className={`fm-frame${selected ? " sel" : ""}`} style={{ ["--fc" as string]: String(n.p.color ?? "#10B981"), ...boxCss(n.s) }} aria-label={`Stage frame: ${n.name}`}>
        <LockBadge n={n} />
        <span className="ftitle" style={textCss(n.s)}>
          {n.name}
        </span>
      </div>
    </>
  );
});

export const ShapeNode = memo(function ShapeNode({ id, selected }: P) {
  const n = useNode(id);
  if (!n) return null;
  const shape = String(n.p.shape ?? "rounded");
  const s = n.s ?? {};
  const text = String(n.p.text ?? "");
  const box = boxCss(s);
  const w = n.w ?? 200,
    h = n.h ?? 120;
  const geom = shapeGeom(shape, w, h, String(n.p.dir ?? "h"), s.borderW ?? 2);
  const drawn = shape === "diamond" || !!geom;
  const dash = s.borderStyle === "dashed" ? "6 4" : s.borderStyle === "dotted" ? "1.5 3" : undefined;
  return (
    <>
      <Resizer n={n} selected={selected} minW={geom?.open ? 16 : 40} minH={geom?.open ? 12 : 30} />
      <div className={`fm-shape ${shape}${selected ? " sel" : ""}`} style={drawn ? { opacity: box.opacity, boxShadow: undefined } : box} aria-label={`Shape: ${text || shape}`}>
        {geom && (
          <svg className="fm-diamond" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
            <path
              d={geom.d}
              className={geom.open ? "open" : undefined}
              style={{ fill: geom.open ? "none" : s.fill, stroke: s.border, strokeWidth: s.borderW ?? (geom.open ? 2 : 1.5), strokeDasharray: dash }}
              vectorEffect="non-scaling-stroke"
            />
            {geom.head && <polygon points={geom.head} className="head" style={{ fill: s.border }} />}
          </svg>
        )}
        {shape === "diamond" && (
          <svg className="fm-diamond" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polygon points="50,1 99,50 50,99 1,50" style={{ fill: s.fill, stroke: s.border, strokeWidth: s.borderW ?? 1.5, strokeDasharray: s.borderStyle === "dashed" ? "6 4" : s.borderStyle === "dotted" ? "1.5 3" : undefined }} vectorEffect="non-scaling-stroke" />
          </svg>
        )}
        <LockBadge n={n} />
        {text && !geom?.open && (
          <div className="stext" style={{ ...textCss(s), ...(shape === "callout" ? { marginBottom: h * 0.22 } : {}) }}>
            {text}
          </div>
        )}
      </div>
    </>
  );
});

export const ImageNode = memo(function ImageNode({ id, selected }: P) {
  const n = useNode(id);
  if (!n) return null;
  const src = String(n.p.src ?? "");
  return (
    <>
      <Resizer n={n} selected={selected} minW={40} minH={40} />
      <div className={`fm-image${selected ? " sel" : ""}${src ? "" : " empty"}`} style={boxCss(n.s)}>
        <LockBadge n={n} />
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- user images (data/remote URLs) on the canvas
          <img src={src} alt={String(n.p.alt ?? "")} draggable={false} style={{ objectFit: n.p.fit === "cover" ? "cover" : "contain" }} />
        ) : (
          <span className="ph">
            <Icon name="image" />
            Add an image in the inspector
          </span>
        )}
      </div>
    </>
  );
});

export const ChecklistNode = memo(function ChecklistNode({ id, selected }: P) {
  const n = useNode(id);
  const ro = useEditor((s) => s.readOnly);
  if (!n) return null;
  const items = checklistOf(n);
  const done = items.filter((i) => i.done).length;
  const toggle = (it: ChecklistItem) => setChecklist(n.id, items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)), { discrete: true });
  return (
    <>
      <WidthResizer n={n} selected={selected} minW={160} />
      <div className={`fm-node checklist${selected ? " sel" : ""}`} style={{ ...(n.w ? { width: n.w } : {}), ...boxCss(n.s) }} aria-label={`Checklist: ${String(n.p.title ?? "")}`}>
        <LockBadge n={n} />
        <div className="ctitle" style={textCss(n.s)}>
          {String(n.p.title ?? "Checklist")}
          <small>
            {done}/{items.length}
          </small>
        </div>
        <ul>
          {items.map((it) => (
            <li key={it.id} style={{ paddingLeft: (it.indent ?? 0) * 16 }}>
              <label className="nodrag">
                <input type="checkbox" checked={it.done} disabled={ro} onChange={() => toggle(it)} aria-label={it.text || "Checklist item"} />
                <span className={it.done ? "done" : ""} style={textCss(n.s)}>
                  {it.text}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
});

export const LinkNode = memo(function LinkNode({ id, selected }: P) {
  const n = useNode(id);
  if (!n) return null;
  const url = String(n.p.url ?? "");
  const video = url && isVideoUrl(url);
  const title = String(n.p.title ?? "") || (url ? hostOf(url) : "Add a link in the inspector");
  return (
    <>
      <WidthResizer n={n} selected={selected} minW={180} />
      <div className={`fm-node linkcard${selected ? " sel" : ""}`} style={{ ...(n.w ? { width: n.w } : {}), ...boxCss(n.s) }} aria-label={`${video ? "Video" : "Link"}: ${title}`}>
        <LockBadge n={n} />
        <span className={`lthumb${video ? " video" : ""}`} aria-hidden="true">
          <Icon name={video ? "play" : "link"} size={18} />
        </span>
        <span className="lbody">
          <b style={textCss(n.s)}>{title}</b>
          {url ? (
            <a className="nodrag" href={url} target="_blank" rel="noopener noreferrer nofollow" onClick={(e) => e.stopPropagation()}>
              {hostOf(url)} ↗
            </a>
          ) : (
            <small>No link yet</small>
          )}
        </span>
      </div>
    </>
  );
});

export const nodeTypes = { block: BlockNode, note: NoteNode, label: LabelNode, frame: FrameNode, shape: ShapeNode, image: ImageNode, checklist: ChecklistNode, link: LinkNode };
