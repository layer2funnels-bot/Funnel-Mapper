"use client";
import { Handle, NodeResizeControl, NodeResizer, Position, ResizeControlVariant, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { Icon } from "@/components/icon";
import { baseOf, CATCOLOR, fourPorts, portsFor, typeOf } from "@/lib/catalog";
import { FAMILIES, hasSplitBar, typeCaption, visualOf, windowKeyOf } from "@/lib/block-visuals";
import { WINDOWS } from "@/lib/design-tiles";
import { brandMarkOf } from "@/lib/brand-marks";
import { assumptionChanges, lostDots, stepDelta } from "@/lib/simulate";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { SimChip } from "./simulate";
import { BlockArtImg, BrandGlyph, offerSubtitle, SplitBar, StatusDot, WireframeStrip } from "./block-visual";
import { artOf } from "@/lib/block-art";
import type { ChecklistItem, FunnelNode } from "@/lib/graph";
import type { IconName } from "@/lib/icons";
import { checklistOf, moveNodes, setChecklist, shownR, startRename, updateNode, useEditor, viewK } from "@/lib/editor/store";
import { blockChip, perfLine, subLabel } from "@/lib/editor/labels";
import { nf, people as ppl, peopleExact } from "@/lib/format";
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
export const BlockNode = memo(function BlockNode({ id, selected }: P) {
  const n = useNode(id);
  const R = useEditor(shownR);
  const cur = useEditor((s) => s.settings.currency);
  const basis = useEditor((s) => s.settings.basis);
  const warn = useEditor((s) => !s.shared && s.warnIds.has(id));
  // the view decides the one number a block shows; "Clean" and a client link without numbers show none
  const view = useEditor((s) => (s.settings.hideNumbers ? "clean" : s.opts.view));
  const perf = view !== "clean";
  // Biggest leak: a dashed ring and a chip above-left (no number); the people lost are on the leak line, once
  const leak = useEditor((s) => s.keyLeak === id && s.opts.view !== "clean" && !s.settings.hideNumbers);
  const lostHere = useEditor((s) => (s.keyLeak === id && s.opts.view !== "clean" && !s.settings.hideNumbers && !s.edges.some((e) => e.from === id && e.port === "alt") ? (s.R.N[id]?.non ?? 0) * viewK(s.opts) : 0));
  const band = useEditor((s) => zoomBand(s.view.k));
  const renaming = useEditor((s) => s.renaming === id);
  const multi = useEditor((s) => s.selNodes.length > 1 && s.selNodes.includes(id));
  const spot = useEditor((s) => s.spot);
  const outOfStage = useEditor((s) => !!s.stageIds && !s.stageIds.includes(id));
  const k = useEditor((s) => viewK(s.opts));
  const build = useEditor((s) => s.opts.build); // the optional build-status layer
  const shared = useEditor((s) => s.shared);
  const simBase = useEditor((s) => s.simBase);
  const cmp = useEditor((s) => s.simBase ?? s.compareBase); // what the changes are measured against: the simulation start, or Baseline while Compare is on
  const simBefore = useEditor((s) => s.simBefore);
  const playing = useEditor((s) => s.simPlay && !!s.simBase);
  const altWired = useEditor((s) => s.edges.some((e) => e.from === id && e.port === "alt"));
  const calm = useReducedMotion();
  if (!n) return null;
  const T = typeOf(n.type);
  const { hasIn, hasOut, hasAlt, labels } = portsFor(n.type);
  const four = fourPorts(n.type);
  const logic = T.cat === "logic";
  const cc = n.s?.accent && /^#[0-9a-f]{6}$/i.test(n.s.accent) ? n.s.accent : CATCOLOR[T.color ?? T.cat];
  const V = visualOf(n.type),
    F = FAMILIES[V.family];
  const chip = n.s?.hideNum ? null : blockChip(n, R, cur, k, view, basis);
  const pl = perf ? perfLine(n, R, cur, k, basis) : null;
  const nodata = !R.N[n.id] || (T.cat !== "traffic" && R.N[n.id].inflow === 0);
  // Simulate: how this step moved against the baseline (only while simulating, and not in a presentation)
  const sd = cmp && perf && !spot && !outOfStage && !shared && !simBefore ? stepDelta(n, R, cmp.R) : null;
  // the assumptions changed on this block while simulating (amber Δ with "was → now" on hover)
  const baseNode = simBase ? simBase.nodes.find((b) => b.id === id) : undefined;
  const changed = baseNode && !simBefore ? assumptionChanges([n], [baseNode]) : [];
  const tone = sd?.changed ? (sd.dRev ? (sd.dRev > 0 ? "up" : "down") : sd.dOut ? (sd.dOut > 0 ? "up" : "down") : null) : null;
  const invalid = n.type === "wait" && !waitValid(n.p);
  const internal = !shared && !!n.desc?.trim();
  const tasks = n.checklist ?? [];
  const cls = ["fm-node", `fam-${V.family}`, `zb-${band}`, logic && "logic", V.brand && "brand", selected && "sel", selected && multi && "multi", warn && "warn", invalid && "err", leak && "leak", perf && pl && "perf", tone && `sim-${tone}`, n.locked && "locked", n.status === "done" && "live", (spot ? (spot === id ? "spot" : "dim") : outOfStage ? "dim" : false)].filter(Boolean).join(" ");
  // Clean and Money keep the caption to the block's type: the one number a view shows is the chip (V3 "one number per block")
  const sub = view !== "people" ? T.label : V.family === "offer" ? offerSubtitle(n) : subLabel(n, cur);
  return (
    <div className={cls} style={{ ["--cc" as string]: cc, ...(V.brand ? { ["--tile" as string]: V.brand } : null), ...boxCss(n.s) }} aria-label={`${T.label}: ${n.name}`} title={band === "far" || n.name.length > 22 ? n.name : undefined}>
      {four ? (
        // V2: four identical ports (hidden at rest; shown on hover, selection and while connecting). The line's meaning is chosen on the line.
        <>
          <Handle type="source" position={Position.Top} id="top" className="fm-port side top" title="Drag to connect" />
          <Handle type="source" position={Position.Right} id="right" className="fm-port side right" title="Drag to connect" />
          <Handle type="source" position={Position.Bottom} id="bottom" className="fm-port side bottom" title={hasAlt ? "Drag to connect (from here: people who leave)" : "Drag to connect"} />
          <Handle type="source" position={Position.Left} id="left" className="fm-port side left" title="Drag to connect" />
        </>
      ) : (
        hasIn && <Handle type="target" position={Position.Left} id="in" className="fm-port in" />
      )}
      <LockBadge n={n} />
      {changed.length > 0 && (
        <span className="fm-delta" title={changed.map((c) => `${c.label} ${nf(c.was, 2)} → ${nf(c.now, 2)}`).join(" · ")} role="img" aria-label={`Changed in this simulation: ${changed.map((c) => `${c.label} ${nf(c.was, 2)} to ${nf(c.now, 2)}`).join(", ")}`}>
          Δ
        </span>
      )}
      {leak && (
        <span className="fm-leak" title="Biggest leak: the step that loses the most people">
          Biggest leak
        </span>
      )}
      {lostHere >= 0.5 && (
        <span className="fm-leakstub" title={`${peopleExact(lostHere)} people leave here`}>
          <i aria-hidden="true" />
          <b>−{ppl(lostHere)}</b>
        </span>
      )}
      {(V.family === "page" || V.family === "offer") && V.wireframe ? (
        // V2 page / offer object (196 × 112): the page window, name and numbers, then a type caption with the status dot
        <div className="pgo">
          <div className="pgo-top">
            <WireframeStrip kind={V.wireframe} accent={cc} win={WINDOWS[windowKeyOf(n.type)]} shot={shared ? undefined : n.shot} owner={{ id: n.id, name: n.name, type: n.type, url: n.url }} />
            <div className="pgo-info">
              {renaming ? <RenameInput id={n.id} value={n.name} /> : <span className="pgo-title" style={textCss(n.s)}>{n.name}</span>}
              {chip && (
                <div className="pgo-m one" title={chip.title}>
                  {!chip.unit.startsWith("/") && <small>{chip.unit}</small>}
                  <strong>
                    {chip.value}
                    {chip.unit.startsWith("/") && <small> {chip.unit}</small>}
                  </strong>
                </div>
              )}
            </div>
          </div>
          <div className="pgo-cap">
            <span className="pgo-ty" style={{ "--cc": cc } as React.CSSProperties}>
              <span className="pgo-ic" style={{ background: cc }}>
                <Icon name={(n.s?.icon as IconName) || T.icon} size={9} />
              </span>
              {typeCaption(n.type)}
            </span>
            {!shared && build && <StatusDot status={n.status} />}
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
        </div>
      ) : (
        <>
      {F.strip && V.wireframe && <WireframeStrip kind={V.wireframe} accent={cc} shot={shared ? undefined : n.shot} owner={{ id: n.id, name: n.name, type: n.type, url: n.url }} />}
      {!shared && build && <StatusDot status={n.status} />}
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
          <small title={chip?.title}>{chip ? `${chip.value} ${chip.unit}`.trim() : sub}</small>
        </div>
      </div>
      {(internal || tasks.length > 0) && (
        <div className="fm-nstats badges">
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
      )}
      {hasSplitBar(n.type) && view !== "clean" && <SplitBar pct={Number(n.p.pct) || 0} test={baseOf(n.type) === "split"} />}
        </>
      )}
      {sd && <SimChip d={sd} k={k} cur={cur} source={T.cat === "traffic"} />}
      {playing && !calm && perf && T.cat !== "traffic" && !altWired && !nodata && (
        <span className="fm-lostfx" aria-hidden="true">
          {Array.from({ length: lostDots(R.N[n.id]?.non ?? 0, R.N[n.id]?.inflow ?? 0) }, (_, j) => (
            <i key={j} style={{ animationDelay: `${j * 0.45}s` }} />
          ))}
        </span>
      )}
      {!four && hasOut && <Handle type="source" position={Position.Right} id="main" className="fm-port out" title={`${labels ? labels[0] : "Converted"}: drag to connect`} />}
      {!four && hasAlt && <Handle type="source" position={Position.Bottom} id="alt" className="fm-port alt" title={`${labels ? labels[1] : "Didn’t convert"}: drag to connect`} />}
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

export const nodeTypes = { widget: WidgetNode, block: BlockNode, note: NoteNode, label: LabelNode, frame: FrameNode, shape: ShapeNode, image: ImageNode, checklist: ChecklistNode, link: LinkNode };
