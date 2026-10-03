"use client";
// Shared renderers for the block visual system (lib/block-visuals.ts). Used by the canvas card (nodes.tsx),
// the library tiles (palette.tsx) and Quick Add, so one block reads the same everywhere.
import { useState } from "react";
import { Icon } from "@/components/icon";
import { useSignedUrl } from "@/components/signed-image";
import { CATCOLOR, typeOf } from "@/lib/catalog";
import type { StepStatus } from "@/lib/graph";
import type { IconName } from "@/lib/icons";
import { offerSubtitle, priceTab } from "@/lib/editor/labels";
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
function PageShot({ path }: { path: string }) {
  const url = useSignedUrl("screenshots", /^https?:|^data:/.test(path) ? null : path);
  const src = /^https?:|^data:/.test(path) ? path : url;
  const [bad, setBad] = useState(false);
  if (!src || bad) return null;
  // eslint-disable-next-line @next/next/no-img-element -- user screenshot
  return <img className="fm-shot" src={src} alt="" draggable={false} onError={() => setBad(true)} />;
}

/** Semantic page wireframe (preview strip). Replaced by a real screenshot in a later phase, never by a generic placeholder. */
export function WireframeStrip({ kind, accent, shot }: { kind: Wireframe; accent: string; shot?: string }) {
  return (
    <div className="fm-wf" style={{ ["--wfa" as string]: accent }} aria-hidden="true">
      {shot && <PageShot path={shot} />}
      <svg viewBox={`0 0 ${WF_SIZE.w} ${WF_SIZE.h}`} preserveAspectRatio="xMidYMid meet" strokeWidth={1}>
        {WIREFRAMES[kind].map((s, i) => (
          <Shape key={i} s={s} />
        ))}
      </svg>
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

/** Library / Quick Add tile for a block, in the shape of its family. */
export function BlockTile({ type, icon, size = 16 }: { type: string; icon: IconName; size?: number }) {
  const v = visualOf(type),
    T = typeOf(type);
  const bg = v.brand ?? CATCOLOR[T?.color ?? T?.cat ?? "annot"];
  return (
    <span className={`pi fam-${v.family}${v.brand ? " brand" : ""}`} style={{ background: bg }}>
      <Icon name={icon} size={size} />
    </span>
  );
}

export { offerSubtitle, priceTab };
