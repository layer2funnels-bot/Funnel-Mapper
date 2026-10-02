// Report sections for client exports (PDF). Pure assembly of results from lib/funnel-math.ts:
// nothing here recalculates the funnel; every figure comes from compute / computeScenario / project / sourceRows / targetPlan.
import { isAnnot } from "./catalog";
import { compute, computeScenario, expenseTotals, num, project, sourceRows, stepRows, targetPlan, type FunnelResult, type GraphLike, type ProjectionRow, type SourceRow } from "./funnel-math";
import type { FunnelSettings } from "./graph";

export type ReportSettings = Pick<FunnelSettings, "basis" | "fixed" | "whatif" | "expenses" | "scenarios" | "projection" | "target">;

const NEUTRAL = { traffic: 1, conv: 1, price: 1, cost: 1 };
const isNeutral = (w: Partial<typeof NEUTRAL> | undefined) => !w || (Object.keys(NEUTRAL) as (keyof typeof NEUTRAL)[]).every((k) => (num(w[k]) || 1) === 1);

export interface ScenarioColumn {
  name: string;
  R: FunnelResult;
}

/** Periods for required numbers. The funnel models one month (as the forecast does). */
export const PERIODS: [string, number][] = [
  ["Per day", 12 / 365],
  ["Per week", 12 / 52],
  ["Per month", 1],
  ["Per year", 12],
];

export interface ReportData {
  /** As mapped (no what-if), the current view if a what-if is applied, then each saved scenario. */
  scenarios: ScenarioColumn[];
  hasScenarios: boolean;
  forecast: { rows: ProjectionRow[]; months: number; growth: number; revenue: number; profit: number; mrr: number; activeSubs: number; breakEven: number | null };
  sources: SourceRow[];
  offers: { id: string; name: string; label: string; buyers: number; revenue: number; share: number }[];
  expenses: {
    lines: [string, number][];
    total: number;
    oneTime: number;
    items: { name: string; category: string; kind: string; amount: number; perPeriod: number }[];
  };
  goals: {
    target: number;
    plan: ReturnType<typeof targetPlan> | null;
    /** [period, revenue, visitors, ad spend, customers] needed for the revenue target. */
    required: [string, number, number, number, number][];
    blocks: { name: string; people: number }[];
  };
}

const KIND_LABEL = { monthly: "Every month", per_sale: "Per order", one_time: "One-time" } as const;

/** Every report section, from the same results the editor shows. `R` is the editor's current result. */
export function reportData(g: GraphLike, s: ReportSettings, R: FunnelResult): ReportData {
  const base = compute(g, { ...s, whatif: NEUTRAL });
  const scenarios: ScenarioColumn[] = [{ name: "As mapped", R: base }];
  if (!isNeutral(s.whatif)) scenarios.push({ name: "Current what-if", R });
  s.scenarios.forEach((sc) => scenarios.push({ name: sc.name || "Scenario", R: computeScenario(g, s, sc) }));

  const { months, growth } = s.projection;
  const rows = project(g, s, months, growth);
  const last = rows[rows.length - 1];
  const be = rows.find((r) => r.cumulative >= 0 && r.month > 0);

  const offers = stepRows(g, R)
    .filter((r) => r.cat === "offer")
    .map((r) => ({ id: r.id, name: r.name, label: r.label, buyers: r.out, revenue: r.rev, share: R.rev ? r.rev / R.rev : 0 }));

  const ex = expenseTotals(s.expenses);
  const items = s.expenses
    .filter((e) => num(e.amount))
    .map((e) => ({ name: e.name || e.category, category: e.category, kind: KIND_LABEL[e.kind], amount: num(e.amount), perPeriod: e.kind === "monthly" ? num(e.amount) : e.kind === "per_sale" ? num(e.amount) * R.orders : 0 }));
  const lines: [string, number][] = (
    [
      ["Ad spend", R.spend],
      ["Follow-up costs", R.actCost],
      ["Delivery & affiliate", R.cogs],
      ["Fixed costs", num(s.fixed)],
      ["Monthly expenses", ex.monthly],
      ["Per-order expenses", R.perSale],
    ] as [string, number][]
  ).filter(([, v]) => v);

  const target = num(s.target);
  const plan = target > 0 ? targetPlan(R, target) : null;
  const required: ReportData["goals"]["required"] = plan ? PERIODS.map(([p, k]) => [p, target * k, plan.visitorsNeeded * k, plan.spendNeeded * k, plan.customersNeeded * k]) : [];
  const blocks = g.nodes.filter((n) => n.type === "goal" && !isAnnot(n.type)).map((n) => ({ name: n.name, people: R.N[n.id]?.inflow ?? 0 }));

  return {
    scenarios,
    hasScenarios: s.scenarios.length > 0,
    forecast: {
      rows,
      months,
      growth,
      revenue: rows.reduce((a, r) => a + r.revenue, 0),
      profit: last?.cumulative ?? 0,
      mrr: last?.mrr ?? 0,
      activeSubs: last?.activeSubs ?? 0,
      breakEven: be ? be.month : null,
    },
    sources: sourceRows(g, s),
    offers,
    expenses: { lines, total: R.costs, oneTime: R.oneTime, items },
    goals: { target, plan, required, blocks },
  };
}
