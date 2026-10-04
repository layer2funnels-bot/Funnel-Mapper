"use client";
// Shared renderers for the block visual system (lib/block-visuals.ts). Used by the canvas card (nodes.tsx),
// the library tiles (palette.tsx) and Quick Add, so one block reads the same everywhere.
import { useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icon";
import { useSignedUrl } from "@/components/signed-image";
import { CATCOLOR, typeOf } from "@/lib/catalog";
import type { StepStatus } from "@/lib/graph";
import type { IconName } from "@/lib/icons";
import { offerSubtitle, priceTab } from "@/lib/editor/labels";
import { brandMarkOf } from "@/lib/brand-marks";
import { visualOf, WF_SIZE, WIREFRAMES, type WfPaint, type WfShape, type Wireframe } from "@/lib/block-visuals";

const PAINT: Record<WfPaint, { fill: string; stroke: string }> = {
  o: { fill: "none", stroke: "var(--line)" },
  d: { fill: "var(--line)", stroke: "none" },
  m: { fill: "var(--edge)", stroke: "none" },
  a: { fill: "var(--wfa)", stroke: "none" },
  ao: { fill: "none", stroke: "var(--wfa)" },
};

function Shape({ s }: { s: WfShape }) {
  if (s[0] === "r") return <rect x={s[1]} y={s[2]} width={s[3]} height={s[4]} rx={s[5]} {...PAINT[s[6]]} />;
  if (s[0] === "c") return <circle cx={s[1]} cy={s[2]} r={s[3]} {...PAINT[s[4]]} />;
  return <path d={s[1]} {...PAINT[s[2]]} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />;
}

/** The captured / uploaded page screenshot (private bucket, signed URL) drawn over the wireframe once it has loaded. */
export function PageShot({ path }: { path: string }) {
  const url = useSignedUrl("screenshots", /^https?:|^data:/.test(path) ? null : path);
  const src = /^https?:|^data:/.test(path) ? path : url;
  const [bad, setBad] = useState(false);
  if (!src || bad) return null;
  // eslint-disable-next-line @next/next/no-img-element -- user screenshot
  return <img className="fm-shot" src={src} alt="" draggable={false} onError={() => setBad(true)} />;
}

/** Bigger look at a captured page while the pointer rests on its strip (fixed to the screen, so zoom and clipping do not shrink it). */
function ShotPeek({ path, anchor }: { path: string; anchor: DOMRect }) {
  const W = 320,
    H = 200;
  const left = Math.max(8, Math.min(window.innerWidth - W - 8, anchor.left + anchor.width / 2 - W / 2));
  const above = anchor.top - H - 10 >= 8;
  const top = above ? anchor.top - H - 10 : Math.min(window.innerHeight - H - 8, anchor.bottom + 10);
  return createPortal(
    <div className="fm-peek" style={{ left, top, width: W, height: H }} aria-hidden="true">
      <PageShot path={path} />
    </div>,
    document.body,
  );
}

/** Semantic page wireframe (preview strip). A saved capture replaces it; the wireframe stays whenever there is none (or it fails to load). */
export function WireframeStrip({ kind, accent, shot }: { kind: Wireframe; accent: string; shot?: string }) {
  const [peek, setPeek] = useState<DOMRect | null>(null);
  return (
    <div
      className={`fm-wf${shot ? " has-shot" : ""}`}
      style={{ ["--wfa" as string]: accent }}
      aria-hidden="true"
      onPointerEnter={shot ? (e) => e.pointerType === "mouse" && setPeek(e.currentTarget.getBoundingClientRect()) : undefined}
      onPointerLeave={shot ? () => setPeek(null) : undefined}
    >
      {shot && <PageShot path={shot} />}
      <svg viewBox={`0 0 ${WF_SIZE.w} ${WF_SIZE.h}`} preserveAspectRatio="xMidYMid meet" strokeWidth={1}>
        {WIREFRAMES[kind].map((s, i) => (
          <Shape key={i} s={s} />
        ))}
      </svg>
      {shot && peek && <ShotPeek path={shot} anchor={peek} />}
    </div>
  );
}

const STATUS_LABEL: Record<StepStatus, string> = { planned: "Planned", building: "In progress", done: "Live" };

/** Build-status dot in the card's top-right corner. */
export function StatusDot({ status }: { status: StepStatus | undefined }) {
  const s = status ?? "planned";
  return <span className={`fm-st ${s}`} title={STATUS_LABEL[s]} role="img" aria-label={`Status: ${STATUS_LABEL[s]}`} />;
}

/** Yes/No or A/B share bar for logic blocks (the second share is "people lost" for Yes/No logic, neutral for tests). */
export function SplitBar({ pct, test }: { pct: number; test: boolean }) {
  const a = Math.max(0, Math.min(100, pct));
  return (
    <div className={`fm-split${test ? " test" : ""}`} aria-hidden="true">
      <i style={{ width: `${a}%` }} />
      <i style={{ width: `${100 - a}%` }} />
    </div>
  );
}

/** Platform mark for a block that stands for one platform (null for any other block). */
export function BrandGlyph({ type, size = 18 }: { type: string; size?: number }) {
  const d = brandMarkOf(type);
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor" className="fm-bmark">
      <path d={d} />
    </svg>
  );
}

/** Library / Quick Add tile for a block, in the shape of its family. */
export function BlockTile({ type, icon, size = 16 }: { type: string; icon: IconName; size?: number }) {
  const v = visualOf(type),
    T = typeOf(type);
  const bg = v.brand ?? CATCOLOR[T?.color ?? T?.cat ?? "annot"];
  return (
    <span className={`pi fam-${v.family}${v.brand ? " brand" : ""}`} style={{ background: bg }}>
      {brandMarkOf(type) ? <BrandGlyph type={type} size={size} /> : <Icon name={icon} size={size} />}
    </span>
  );
}

export { offerSubtitle, priceTab };
