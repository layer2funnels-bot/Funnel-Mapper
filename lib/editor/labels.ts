// Text shown on blocks and edges, ported from the prototype's subLabel() / nodeStats().
// Returns plain segments (bold or not) so React, SVG and PDF exports can all render them.
import { getSmoothStepPath, getStraightPath, Position } from "@xyflow/react";
import { baseOf, INT_LABEL, typeOf, type Interval } from "../catalog";
import { money, nf } from "../format";
import { num, type FunnelResult } from "../funnel-math";
import type { FunnelNode } from "../graph";
import type { edgeLook } from "../style";

export type Seg = { t: string; b?: boolean };

export function subLabel(n: FunnelNode, cur: string): string {
  const T = typeOf(n.type),
    p = n.p;
  const eff = num(p.price) * (1 - num(p.disc) / 100);
  const b = baseOf(n.type),
    [ya, yb] = T.ports ?? ["Yes", "No"];
  if (b === "sub") return `${money(eff, cur)}/${INT_LABEL[p.interval as Interval] || "month"}${num(p.trialDays) ? ` · ${p.trialDays}-day trial` : ""}`;
  if (b === "plan") return `${num(p.pays)} × ${money(eff, cur)}`;
  if (T.cat === "offer") return `${money(eff, cur)}${num(p.disc) ? ` (−${nf(num(p.disc))}%)` : ""}`;
  if (b === "cond") return `${ya} ${nf(num(p.pct), 1)}%`;
  if (b === "split") return `${ya} ${nf(num(p.pct), 1)}% · ${yb} ${nf(100 - num(p.pct), 1)}%`;
  if (n.type === "wait") return `${nf(num(p.days))} days`;
  if (T.cat === "traffic") return p.model === "cpc" ? "Cost per click" : p.model === "cpm" ? "Cost per 1,000 views" : T.label;
  return T.label;
}

/** Block stats. `k` scales people and money to another period (Forecast layer: day / week / year). */
export function nodeStats(n: FunnelNode, R: FunnelResult, cur: string, k = 1): Seg[] {
  const T = typeOf(n.type),
    r0 = R.N[n.id];
  if (!r0 || !T) return [];
  const r = k === 1 ? r0 : { ...r0, inflow: r0.inflow * k, out: r0.out * k, non: r0.non * k, rev: r0.rev * k, spend: r0.spend * k };
  if (T.cat === "traffic") return [{ t: nf(r.out), b: true }, { t: ` visits · ${r.spend ? money(r.spend, cur) : "free"}` }];
  if (T.cat === "offer") return [{ t: nf(r.out, 1), b: true }, { t: " buy · " }, { t: money(r.rev, cur), b: true }];
  const b = baseOf(n.type);
  if (b === "cond" || b === "split") {
    const [ya, yb] = T.ports ?? ["Yes", "No"];
    return [{ t: `${ya} ` }, { t: nf(r.out, 1), b: true }, { t: ` · ${yb} ` }, { t: nf(r.non, 1), b: true }];
  }
  if (b === "goal" || b === "exit") return [{ t: nf(r.inflow, 1), b: true }, { t: " people" }];
  return [{ t: `In ${nf(r.inflow)} → ` }, { t: nf(r.out, 1), b: true }, { t: ` (${nf(num(n.p.cr), 1)}%)` }];
}

export const segText = (s: Seg[]) => s.map((x) => x.t).join("");

/** Edge label tag: Yes/No, A/B, or No for a didn't-convert path. */
export function edgeTag(fromType: string | undefined, port: "main" | "alt"): { text: string; alt: boolean } | null {
  const ports = fromType ? typeOf(fromType)?.ports : undefined;
  if (ports) return port === "alt" ? { text: ports[1], alt: true } : { text: ports[0], alt: false };
  if (port === "alt") return { text: "No", alt: true };
  return null;
}

/** Same bezier as the prototype's curve(): right/bottom port out, left port in. Returns path + label midpoint. */
export function curve(x1: number, y1: number, port: "main" | "alt", x2: number, y2: number): [string, [number, number]] {
  const dx = Math.max(50, Math.abs(x2 - x1) / 2);
  const c1 = port === "alt" ? [x1, y1 + Math.max(60, Math.abs(y2 - y1) / 2)] : [x1 + dx, y1];
  const c2 = [x2 - dx, y2];
  return [`M ${x1} ${y1} C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${x2} ${y2}`, [(x1 + 3 * c1[0] + 3 * c2[0] + x2) / 8, (y1 + 3 * c1[1] + 3 * c2[1] + y2) / 8]];
}

/** Path + label point for the connection's line style (curved is the prototype's own bezier). Shared by the canvas and the map export. */
export function edgePath(look: Pick<ReturnType<typeof edgeLook>, "path">, port: "main" | "alt", sx: number, sy: number, tx: number, ty: number): [string, number, number] {
  if (look.path === "straight") {
    const [d, lx, ly] = getStraightPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty });
    return [d, lx, ly];
  }
  if (look.path === "elbow") {
    const [d, lx, ly] = getSmoothStepPath({ sourceX: sx, sourceY: sy, sourcePosition: port === "alt" ? Position.Bottom : Position.Right, targetX: tx, targetY: ty, targetPosition: Position.Left, borderRadius: 10 });
    return [d, lx, ly];
  }
  const [d, [mx, my]] = curve(sx, sy, port, tx, ty);
  return [d, mx, my];
}
