"use client";
import { Handle, NodeResizeControl, NodeResizer, Position, ResizeControlVariant, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { Icon } from "@/components/icon";
import { baseOf, blockH, CATCOLOR, isAnnot, nodeW, portsFor, typeOf } from "@/lib/catalog";
import { FAMILIES, hasSplitBar, visualOf } from "@/lib/block-visuals";
import { brandMarkOf } from "@/lib/brand-marks";
import { lostDots, stepDelta } from "@/lib/simulate";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { SimChip } from "./simulate";
import { BlockArtImg, BrandGlyph, offerSubtitle, priceTab, SplitBar, StatusDot, WireframeStrip } from "./block-visual";
import { artOf } from "@/lib/block-art";
import type { ChecklistItem, FunnelNode } from "@/lib/graph";
import type { IconName } from "@/lib/icons";
import { checklistOf, moveNodes, setChecklist, shownR, startRename, updateNode, useEditor } from "@/lib/editor/store";
import { frameTotals, nodeStats, perfLine, subLabel } from "@/lib/editor/labels";
import { goalCurrent } from "@/lib/report-data";
import { nf } from "@/lib/format";
import { periodFactor } from "@/lib/funnel-math";
import { waitValid } from "@/lib/wait";
import { boxCss, shapeGeom, textCss } from "@/lib/style";
import { hostOf, isVideoUrl } from "@/lib/rich-text";
import { RichText } from "@/components/rich-text";
import { WidgetNode } from "./widget-node";

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

/** Zoom-dependent detail: far = icon + short name; mid = name + type; near = key numbers too. */
export const zoomBand = (k: number): "far" | "mid" | "near" => (k < 0.4 ? "far" : k <= 0.75 ? "mid" : "near");

function RenameInput({ id, value }: { id: string; value: string }) {
  const [v, setV] = useState(value);
  const done = (save: boolean) => {
    if (save && v.trim() && v !== value) updateNode(id, { name: v.trim() });
    startRename(null);
  };
  return (
    <input
      className="fm-rename nodrag nopan"
      autoFocus
      aria-label="Block name"
      value={v}
      maxLength={120}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => done(true)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") done(true);
        if (e.key === "Escape") done(false);
      }}
      onDoubleClick={(e) => e.stopPropagation()}
    />
  );
}

/** Progress of the goal attached to a goal block (target comes from Plan / Reports goals, never invented). */
function GoalBar({ n }: { n: FunnelNode }) {
  const goals = useEditor((s) => s.settings.goals);
  const nodes = useEditor((s) => s.nodes);
  const R = useEditor((s) => s.R);
  const g = goals.find((x) => x.nodeId === n.id && x.value > 0);
  if (!g) return null;
  const cur = goalCurrent(nodes, R, g);
  const p = Number.isFinite(cur) ? Math.max(0, Math.min(1, cur / g.value)) : 0;
  return (
    <div className="fm-goalbar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)} aria-label={`${g.name || "Goal"} progress`}>
      <i style={{ width: `${p * 100}%` }} />
      <span>{nf(p * 100)}%</span>
    </div>
  );
}

export const BlockNode = memo(function BlockNode({ id, selected }: P) {
  const n = useNode(id);
  const R = useEditor(shownR);
  const cur = useEditor((s) => s.settings.currency);
  const warn = useEditor((s) => !s.shared && s.warnIds.has(id));
  const leak = useEditor((s) => s.keyLeak === id && s.opts.nums && s.opts.thick && !s.settings.hideNumbers);
  const perf = useEditor((s) => s.opts.nums && s.opts.thick && !s.settings.hideNumbers);
  const band = useEditor((s) => zoomBand(s.view.k));
  const renaming = useEditor((s) => s.renaming === id);
  const multi = useEditor((s) => s.selNodes.length > 1 && s.selNodes.includes(id));
  const spot = useEditor((s) => s.spot);
  const outOfStage = useEditor((s) => !!s.stageIds && !s.stageIds.includes(id));
  const period = useEditor((s) => s.opts.period);
  const shared = useEditor((s) => s.shared);
  const simBase = useEditor((s) => s.simBase);
  const simBefore = useEditor((s) => s.simBefore);
  const playing = useEditor((s) => s.simPlay && !!s.simBase);
  const altWired = useEditor((s) => s.edges.some((e) => e.from === id && e.port === "alt"));
  const calm = useReducedMotion();
  if (!n) return null;
  const T = typeOf(n.type);
  const { hasIn, hasOut, hasAlt, labels } = portsFor(n.type);
  const logic = T.cat === "logic";
  const cc = CATCOLOR[T.color ?? T.cat];
  const V = visualOf(n.type),
    F = FAMILIES[V.family];
  const k = periodFactor(period);
  const stats = nodeStats(n, R, cur, k);
  const pl = perf ? perfLine(n, R, cur, k) : null;
  const nodata = !R.N[n.id] || (T.cat !== "traffic" && R.N[n.id].inflow === 0);
  // Simulate: how this step moved against the baseline (only while simulating, and not in a presentation)
  const sd = simBase && perf && !spot && !outOfStage && !shared && !simBefore ? stepDelta(n, R, simBase.R) : null;
  const tone = sd?.changed ? (sd.dRev ? (sd.dRev > 0 ? "up" : "down") : sd.dOut ? (sd.dOut > 0 ? "up" : "down") : null) : null;
  const invalid = n.type === "wait" && !waitValid(n.p);
  const internal = !shared && !!n.desc?.trim();
  const tasks = n.checklist ?? [];
  const cls = ["fm-node", `fam-${V.family}`, `zb-${band}`, logic && "logic", V.brand && "brand", selected && "sel", selected && multi && "multi", warn && "warn", invalid && "err", leak && "leak", perf && pl && "perf", tone && `sim-${tone}`, n.locked && "locked", n.status === "done" && "live", (spot ? (spot === id ? "spot" : "dim") : outOfStage ? "dim" : false)].filter(Boolean).join(" ");
  const sub = V.family === "offer" ? offerSubtitle(n) : subLabel(n, cur);
  return (
    <div className={cls} style={{ ["--cc" as string]: cc, ...(V.brand ? { ["--tile" as string]: V.brand } : null), ...boxCss(n.s) }} aria-label={`${T.label}: ${n.name}`} title={band === "far" || n.name.length > 22 ? n.name : undefined}>
      {hasIn && <Handle type="target" position={Position.Left} id="in" className="fm-port in" />}
      <LockBadge n={n} />
      {leak && (
        <span className="fm-leak" title="Key leak: the step that loses the most people">
          Key leak
        </span>
      )}
      {F.strip && V.wireframe && <WireframeStrip kind={V.wireframe} accent={cc} shot={shared ? undefined : n.shot} />}
      {F.price && <span className="fm-price">{priceTab(n, cur)}</span>}
      {!shared && <StatusDot status={n.status} />}
      <div className="fm-nhead">
        {artOf(n.type) && !n.s?.icon ? (
          <span className="fm-nicon art">
            <BlockArtImg k={n.type} />
          </span>
        ) : (
          <span className="fm-nicon">{brandMarkOf(n.type) && !n.s?.icon ? <BrandGlyph type={n.type} /> : <Icon name={(n.s?.icon as IconName) || T.icon} />}</span>
        )}
        <div className="fm-ntitle">
          {renaming ? <RenameInput id={n.id} value={n.name} /> : <span style={textCss(n.s)}>{n.name}</span>}
          {pl ? (
            <small className="fm-perf-line">
              <b>{pl.headline}</b> {pl.caption}
            </small>
          ) : (
            <small>{sub}</small>
          )}
        </div>
      </div>
      {hasSplitBar(n.type) && <SplitBar pct={Number(n.p.pct) || 0} test={baseOf(n.type) === "split"} />}
      {pl && pl.ratio != null && (
        <div className="fm-conv" aria-hidden="true">
          <i style={{ width: `${pl.ratio * 100}%` }} />
          {sd?.changed && sd.was?.ratio != null && <b className="base" style={{ left: `${sd.was.ratio * 100}%` }} />}
        </div>
      )}
      {V.family === "goal" && <GoalBar n={n} />}
      <div className="fm-nstats">
        {nodata ? (
          <span className="fm-nodata">No data yet</span>
        ) : (
          stats.map((s, i) => (s.b ? <b key={i}>{s.t}</b> : <span key={i}>{s.t}</span>))
        )}
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
      {sd && <SimChip d={sd} k={k} cur={cur} source={T.cat === "traffic"} />}
      {playing && !calm && perf && T.cat !== "traffic" && !altWired && !nodata && (
        <span className="fm-lostfx" aria-hidden="true">
          {Array.from({ length: lostDots(R.N[n.id]?.non ?? 0, R.N[n.id]?.inflow ?? 0) }, (_, j) => (
            <i key={j} style={{ animationDelay: `${j * 0.45}s` }} />
          ))}
        </span>
      )}
      {hasOut && <Handle type="source" position={Position.Right} id="main" className="fm-port out" title={`${labels ? labels[0] : "Converted"}: drag to connect`} />}
      {hasAlt && <Handle type="source" position={Position.Bottom} id="alt" className="fm-port alt" title={`${labels ? labels[1] : "Didn’t convert"}: drag to connect`} />}
      {labels && (
        <span className="fm-plabel out" aria-hidden="true">
          {labels[0]}
        </span>
      )}
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
  const perf = useEditor((s) => s.opts.nums && s.opts.thick && !s.settings.hideNumbers);
  const totals = useEditor((s) => {
    if (!(s.opts.nums && s.opts.thick) || s.settings.hideNumbers) return "";
    const f = s.nodes.find((x) => x.id === id);
    if (!f || f.type !== "frame") return "";
    const members = s.nodes.filter((m) => m.type !== "frame" && !isAnnot(m.type) && m.x + nodeW(m.type) / 2 > f.x && m.x + nodeW(m.type) / 2 < f.x + (f.w ?? 0) && m.y + blockH(m.type) / 2 > f.y && m.y + blockH(m.type) / 2 < f.y + (f.h ?? 0));
    return frameTotals(members, s.R, s.settings.currency, periodFactor(s.opts.period)).text;
  });
  if (!n) return null;
  return (
    <>
      <Resizer n={n} selected={selected} minW={160} minH={100} />
      <div className={`fm-frame${selected ? " sel" : ""}`} style={{ ["--fc" as string]: String(n.p.color ?? "#10B981"), ...boxCss(n.s) }} aria-label={`Stage frame: ${n.name}`}>
        <LockBadge n={n} />
        <span className="ftitle" style={textCss(n.s)}>
          {n.name}
          {perf && totals && <span className="ftotal"> {totals}</span>}
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

export const nodeTypes = { widget: WidgetNode, block: BlockNode, note: NoteNode, label: LabelNode, frame: FrameNode, shape: ShapeNode, image: ImageNode, checklist: ChecklistNode, link: LinkNode };
