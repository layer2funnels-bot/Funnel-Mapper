import type { Metadata } from "next";
import Link from "next/link";
import { GraphThumb } from "@/components/graph-thumb";
import { Icon } from "@/components/icon";
import { PageHeader, Stat } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import type { FunnelSummary } from "@/lib/funnel-math";
import { money, moneyShort, ratio, timeAgo } from "@/lib/format";
import { parseGraph } from "@/lib/graph";
import { healthChecks } from "@/lib/health";
import { monthlyValue, pricingValue } from "@/lib/pricing";
import { STATUS_LABEL } from "@/lib/schemas";
import { typeOf } from "@/lib/catalog";
import { byCurrencyRows, homeRange } from "@/lib/home-range";
import { HomeRangePicker } from "@/components/home-range-picker";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

const PIPE: Record<string, string> = { active: "#22c55e", proposal: "#60a5fa", lead: "#94a3b8", paused: "#fbbf24", past: "#64748b" };

/** Money per currency, one row each (V2: never added across currencies). */
function byCurrency(rows: { cur: string; v: number }[], fallback = "GBP") {
  const list = byCurrencyRows(rows);
  if (!list.length) return money(0, fallback);
  return (
    <span className="fm-curlist">
      {list.map((r) => (
        <span key={r.cur} className="block">
          {moneyShort(r.v, r.cur)}
        </span>
      ))}
    </span>
  );
}
const byCurrencyText = (rows: { cur: string; v: number }[]) => byCurrencyRows(rows).map((r) => moneyShort(r.v, r.cur)).join(" · ") || "–";

export default async function Dashboard({ searchParams }: PageProps<"/">) {
  const { sb, profile, workspace } = await requireUser();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const range = homeRange(one(sp.range), one(sp.from), one(sp.to));
  // plan figures are per month: a range multiplies them by its number of months
  const k = range.months;
  const [{ data: clients }, { data: funnels }] = await Promise.all([
    // archived clients (and their funnels) are out of the active portfolio
    sb.from("clients").select("id, name, status, currency, logo_url, pricing_model, monthly_retainer, pricing_amount, billing_frequency, hours_per_month").is("archived_at", null).is("deleted_at", null).order("name"),
    sb.from("funnels").select("id, name, status, client_id, summary, settings, graph, updated_at, thumbnail_url").is("deleted_at", null).order("updated_at", { ascending: false }),
  ]);
  const cl = clients ?? [];
  const clientById = Object.fromEntries(cl.map((c) => [c.id, c]));
  const fs = (funnels ?? []).filter((f) => clientById[f.client_id] && f.status !== "archived");
  // recorded actuals in the range (whole periods inside it), for live funnels
  const liveIds = fs.filter((f) => f.status === "live").map((f) => f.id);
  const { data: acts } = liveIds.length ? await sb.from("funnel_actuals").select("funnel_id, revenue, spend, period_start, period_end").in("funnel_id", liveIds).gte("period_start", range.start).lte("period_end", range.end) : { data: [] as { funnel_id: string; revenue: number | null; spend: number | null }[] };
  const curOf = (f: (typeof fs)[number]) => ((f.settings as { currency?: string })?.currency ?? clientById[f.client_id]?.currency ?? workspace.default_currency);
  const sum = (f: (typeof fs)[number]) => (f.summary ?? {}) as Partial<FunnelSummary>;
  const active = cl.filter((c) => c.status === "active");
  const live = fs.filter((f) => f.status === "live");
  const pipeline = cl.filter((c) => c.status === "lead" || c.status === "proposal");
  const proposed = fs.filter((f) => f.status === "proposed");
  const today = new Date();
  const hour = today.getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const first = profile.full_name ? profile.full_name.split(" ")[0] : "";
  const latest = fs[0];
  // health for the funnels people touched most recently (parsed from the saved map, same checks as the editor)
  const checked = fs.slice(0, 40).map((f) => ({ f, checks: healthChecks(parseGraph(f.graph)) }));
  const attention = checked.filter((x) => x.checks.length > 0).slice(0, 5);
  const recent = fs.slice(0, 3);
  const perClient = (["active", "proposal", "lead", "paused", "past"] as const).map((s) => ({ s, n: cl.filter((c) => c.status === s).length }));

  const weekday = today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const blocks = (f: (typeof fs)[number]) => parseGraph(f.graph).nodes.filter((n) => typeOf(n.type)?.cat !== "annot").length;
  // other things worth a look, from the saved numbers only: funnels losing money, clients with funnels and no price set
  const losing = fs.filter((f) => (sum(f).profit ?? 0) < 0 && f.status !== "draft").slice(0, 2);
  const unpriced = cl.filter((c) => c.status !== "past" && pricingValue(c) <= 0 && fs.some((f) => f.client_id === c.id)).slice(0, 2);

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader eyebrow={weekday} title={`${greet}${first ? `, ${first}` : ""}`}>
        <HomeRangePicker current={range.key} label={range.label} from={range.from} to={range.to} />
      </PageHeader>

      <section aria-label="Totals" className="fm-kgrid mb-9">
        <Stat label="Active clients" value={active.length} hint={`${pipeline.length} in the pipeline · ${cl.length} total`} />
        <Stat label="Live funnels" value={live.length} hint={`${proposed.length} proposed · ${fs.length} total`} />
        <Stat
          label={`Planned revenue · ${range.label}`}
          value={byCurrency(live.map((f) => ({ cur: curOf(f), v: (sum(f).rev ?? 0) * k })), workspace.default_currency)}
          hint={
            <>
              <span className="fm-tag plan">Plan</span> live funnels · {k === 1 ? "1 month" : `${k} months`} · profit {byCurrencyText(live.map((f) => ({ cur: curOf(f), v: (sum(f).profit ?? 0) * k })))}
              {(acts ?? []).length > 0 && (
                <span className="mt-1 block">
                  <span className="fm-tag actual">Actual</span> recorded {byCurrencyText((acts ?? []).map((a) => ({ cur: curOf(fs.find((f) => f.id === a.funnel_id)!), v: Number(a.revenue ?? 0) })))}
                </span>
              )}
            </>
          }
        />
        <Stat
          label={`Agency fees · ${range.label}`}
          value={byCurrency(active.map((c) => ({ cur: c.currency, v: monthlyValue(c) * k })), workspace.default_currency)}
          hint={`Agency MRR ${byCurrencyText(active.map((c) => ({ cur: c.currency, v: monthlyValue(c) })))} / mo · client funnel MRR ${byCurrencyText(live.map((f) => ({ cur: curOf(f), v: sum(f).mrr ?? 0 })))} / mo`}
        />
      </section>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="resume-h">
            <div className="fm-secth">
              <h2 id="resume-h">Pick up where you left off</h2>
              <Link href="/funnels">All funnels</Link>
            </div>
            {recent.length === 0 ? (
              <p className="fm-empty-line">No funnels yet. Create a client, then map their first funnel.</p>
            ) : (
              <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
                {recent.map((f) => (
                  <li key={f.id}>
                    <Link href={`/funnels/${f.id}`} className="fm-fcard">
                      <span className="fm-fthumb">
                        <GraphThumb graph={f.graph} settings={f.settings} name={f.name} height={118} className="h-[118px] w-full" />
                        <span className="fm-fchip">{blocks(f)} blocks</span>
                      </span>
                      <span className="fm-frow">
                        <b title={f.name}>{f.name}</b>
                        <StatusPill status={f.status} />
                      </span>
                      <span className="fm-frow sub">
                        <span className="truncate">
                          {clientById[f.client_id]?.name} · edited {timeAgo(f.updated_at)}
                        </span>
                        <span className="shrink-0 text-ink">
                          <b className="font-semibold">{money(sum(f).rev, curOf(f))}</b> / mo
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="recent-h">
            <div className="fm-secth">
              <h2 id="recent-h">Recent funnels</h2>
              <Link href="/funnels">View {fs.length}</Link>
            </div>
            {fs.length === 0 ? null : (
              <div className="fm-tblwrap" tabIndex={0} role="region" aria-label="Recent funnels (scrolls sideways when it is wider than the screen)">
                <table className="tbl fm-stackrows">
                  <thead>
                    <tr>
                      <th>Funnel</th>
                      <th>Client</th>
                      <th>Status</th>
                      <th className="r">Revenue / mo</th>
                      <th className="r">Profit / mo</th>
                      <th className="r">ROAS</th>
                      <th className="r">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fs.slice(0, 6).map((f) => (
                      <tr key={f.id}>
                        <td>
                          <Link href={`/funnels/${f.id}`} className="font-semibold text-ink no-underline hover:text-brand">
                            {f.name}
                          </Link>
                        </td>
                        <td className="text-muted" data-label="Client">{clientById[f.client_id]?.name}</td>
                        <td data-label="Status">
                          <StatusPill status={f.status} />
                        </td>
                        <td className="r" data-label="Revenue / mo">{money(sum(f).rev, curOf(f))}</td>
                        <td className={`r ${(sum(f).profit ?? 0) < 0 ? "text-neg" : "text-good"}`} data-label="Profit / mo">{money(sum(f).profit, curOf(f))}</td>
                        <td className="r" data-label="ROAS">{ratio(sum(f).roas)}</td>
                        <td className="r text-muted" data-label="Updated">{timeAgo(f.updated_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-10">
          <section aria-labelledby="attn-h">
            <div className="fm-secth">
              <h2 id="attn-h">Needs attention</h2>
              <span className="text-xs text-muted">{attention.length + losing.length + unpriced.length}</span>
            </div>
            {attention.length + losing.length + unpriced.length === 0 ? (
              <p className="fm-empty-line">Every funnel passes its checks.</p>
            ) : (
              <ul className="fm-attn">
                {attention.map(({ f, checks }) => (
                  <li key={`c-${f.id}`}>
                    <span className="fm-aic warn">
                      <Icon name="alert" size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b>
                        {f.name} has {checks.length} {checks.length === 1 ? "check" : "checks"}
                      </b>
                      <small>
                        {clientById[f.client_id]?.name} · {checks[0].text}
                      </small>
                    </span>
                    <Link href={`/funnels/${f.id}`} className="btn sm">
                      Fix
                    </Link>
                  </li>
                ))}
                {losing.map((f) => (
                  <li key={`l-${f.id}`}>
                    <span className="fm-aic lost">
                      <Icon name="chart" size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b>
                        {f.name} loses {money(Math.abs(sum(f).profit ?? 0), curOf(f))} / mo
                      </b>
                      <small>
                        {clientById[f.client_id]?.name} · ROAS {ratio(sum(f).roas)}
                      </small>
                    </span>
                    <Link href={`/funnels/${f.id}`} className="btn sm">
                      Open
                    </Link>
                  </li>
                ))}
                {unpriced.map((c) => (
                  <li key={`p-${c.id}`}>
                    <span className="fm-aic">
                      <Icon name="users" size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b>
                        {c.name} has {fs.filter((f) => f.client_id === c.id).length} funnels, no pricing set
                      </b>
                      <small>{STATUS_LABEL[c.status] ?? c.status}</small>
                    </span>
                    <Link href={`/clients/${c.id}?tab=details`} className="btn sm">
                      Set pricing
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="clients-h">
            <div className="fm-secth">
              <h2 id="clients-h">Client pipeline</h2>
              <Link href="/clients">Clients</Link>
            </div>
            <div className="fm-pipebar" aria-hidden="true">
              {perClient
                .filter((x) => x.n > 0)
                .map((x) => (
                  <i key={x.s} style={{ flex: x.n, background: PIPE[x.s] }} />
                ))}
            </div>
            <ul className="fm-pipe">
              {perClient.map(({ s, n }) => (
                <li key={s}>
                  <Link href={`/clients?status=${s}`}>
                    <span className="stp">
                      <i style={{ background: PIPE[s] }} aria-hidden="true" />
                      {STATUS_LABEL[s] ?? s}
                    </span>
                    <b>{n}</b>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
