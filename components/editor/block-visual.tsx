"use client";
// Shared renderers for the block visual system (lib/block-visuals.ts). Used by the canvas card (nodes.tsx),
// the library tiles (palette.tsx) and Quick Add, so one block reads the same everywhere.
import { Icon } from "@/components/icon";
import { baseOf, CATCOLOR, typeOf, type Interval } from "@/lib/catalog";
import type { FunnelNode, StepStatus } from "@/lib/graph";
import type { IconName } from "@/lib/icons";
import { money, nf } from "@/lib/format";
import { num } from "@/lib/funnel-math";
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

/** Semantic page wireframe (preview strip). Replaced by a real screenshot in a later phase, never by a generic placeholder. */
export function WireframeStrip({ kind, accent }: { kind: Wireframe; accent: string }) {
  return (
    <div className="fm-wf" style={{ ["--wfa" as string]: accent }} aria-hidden="true">
      <svg viewBox={`0 0 ${WF_SIZE.w} ${WF_SIZE.h}`} preserveAspectRatio="xMidYMid meet" strokeWidth={1}>
        {WIREFRAMES[kind].map((s, i) => (
          <Shape key={i} s={s} />
        ))}
      </svg>
    </div>
  );
}

const SHORT: Record<Interval, string> = { weekly: "wk", monthly: "mo", quarterly: "qtr", yearly: "yr" };

/** Price tab text for offer blocks: `$37`, `↑ $297`, `↓ $27`, `+ $9`, `$70 / mo`, `3 × $333`. */
export function priceTab(n: FunnelNode, cur: string): string {
  const p = n.p,
    eff = num(p.price) * (1 - num(p.disc) / 100),
    b = baseOf(n.type);
  if (b === "sub") return `${money(eff, cur)} / ${SHORT[p.interval as Interval] ?? "mo"}`;
  if (b === "plan") return `${num(p.pays)} × ${money(eff, cur)}`;
  const lead = n.type === "upsell" || n.type === "oto" ? "↑ " : n.type === "downsell" ? "↓ " : n.type === "bump" ? "+ " : "";
  return lead + money(eff, cur);
}

/** Second line of an offer card (the price lives in the price tab). */
export function offerSubtitle(n: FunnelNode): string {
  const p = n.p,
    parts = [typeOf(n.type).label];
  if (num(p.disc)) parts.push(`−${nf(num(p.disc))}%`);
  if (baseOf(n.type) === "sub" && num(p.trialDays)) parts.push(`${p.trialDays}-day trial`);
  return parts.join(" · ");
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
