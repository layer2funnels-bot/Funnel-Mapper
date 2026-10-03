// Funnel health: the same checks as warnings() in lib/funnel-math.ts, but each one knows which block it is about,
// so the inspector can select and zoom to it. The texts are asserted equal to warnings() in tests/unit/health.test.ts.
import { baseOf, typeOf } from "./catalog";
import { num, type GraphLike } from "./funnel-math";
import { waitValid } from "./wait";

export interface HealthCheck {
  id: string;
  text: string;
  /** The block to select and zoom to (absent for funnel-wide checks). */
  nodeId?: string;
}

export function healthChecks(g: GraphLike): HealthCheck[] {
  const out: HealthCheck[] = [];
  for (const n of g.nodes) {
    const T = typeOf(n.type);
    if (!T || T.cat === "annot") continue;
    const outs = g.edges.filter((e) => e.from === n.id);
    if (T.cat !== "traffic" && !g.edges.some((e) => e.to === n.id)) out.push({ id: `in-${n.id}`, nodeId: n.id, text: `“${n.name}” has no incoming connection, so nobody reaches it.` });
    const [yes, no] = T.ports ?? ["Yes", "No"];
    if (baseOf(n.type) === "cond" && (!outs.some((e) => e.port !== "alt") || !outs.some((e) => e.port === "alt")))
      out.push({ id: `cond-${n.id}`, nodeId: n.id, text: `Condition “${n.name}” is missing its ${!outs.some((e) => e.port !== "alt") ? yes : no} path.` });
    if (baseOf(n.type) === "split" && outs.length < 2) out.push({ id: `split-${n.id}`, nodeId: n.id, text: `Split “${n.name}” needs both a ${yes} and a ${no} path.` });
    if (baseOf(n.type) === "sub" && !num(n.p.life)) out.push({ id: `sub-${n.id}`, nodeId: n.id, text: `Subscription “${n.name}” has 0 months average stay, so lifetime value equals one payment.` });
    if (n.type === "wait" && !waitValid(n.p)) out.push({ id: `wait-${n.id}`, nodeId: n.id, text: `Wait “${n.name}” has no duration.` });
  }
  if (!g.nodes.some((n) => typeOf(n.type)?.cat === "traffic") && g.nodes.length) out.push({ id: "no-traffic", text: "Add a traffic source so numbers can flow." });
  return out;
}
