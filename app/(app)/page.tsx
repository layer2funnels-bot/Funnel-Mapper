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
import { monthlyValue } from "@/lib/pricing";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

/** Sums a value per currency and renders "£12.3k + $4k". */
function byCurrency(rows: { cur: string; v: number }[]) {
  const m = new Map<string, number>();
  rows.forEach((r) => m.set(r.cur, (m.get(r.cur) ?? 0) + (Number.isFinite(r.v) ? r.v : 0)));
  if (!m.size) return money(0);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => moneyShort(v, c)).join(" + ");
}

const RANGES = [
  ["month", "This month", 1],
  ["year", "Year", 12],
] as const;

export default async function Dashboard({ searchParams }: PageProps<"/">) {
  const { sb, profile, workspace } = await requireUser();
  const sp = await searchParams;
  const range = RANGES.find(([k]) => k === (Array.isArray(sp.range) ? sp.range[0] : sp.range)) ?? RANGES[0];
  const k = range[2];
  const [{ data: clients }, { data: funnels }] = await Promise.all([
    // archived clients (and their funnels) are out of the active portfolio
    sb.from("clients").select("id, name, status, currency, logo_url, pricing_model, monthly_retainer, pricing_amount, billing_frequency, hours_per_month").is("archived_at", null).is("deleted_at", null).order("name"),
    sb.from("funnels").select("id, name, status, client_id, summary, settings, graph, updated_at, thumbnail_url").is("deleted_at", null).order("updated_at", { ascending: false }),
  ]);
  const cl = clients ?? [];
  const clientById = Object.fromEntries(cl.map((c) => [c.id, c]));
  const fs = (funnels ?? []).filter((f) => clientById[f.client_id] && f.status !== "archived");
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
  const maxN = Math.max(1, ...perClient.map((x) => x.n));

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader title={`${greet}${first ? `, ${first}` : ""}`} sub={`${today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · ${workspace.agency_name || "Layer2Funnels"} at a glance.`}>
        <div className="seg" role="group" aria-label="Period">
          {RANGES.map(([key, label]) => (
            <Link key={key} href={key === "month" ? "/" : `/?range=${key}`} aria-pressed={range[0] === key} className="no-underline" role="button" scroll={false}>
              {label}
            </Link>
          ))}
        </div>
      </PageHeader>

      <section aria-label="Totals" className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active clients" value={active.length} hint={`${pipeline.length} in the pipeline · ${cl.length} total`} />
        <Stat label="Live funnels" value={live.length} hint={`${proposed.length} proposed · ${fs.length} total`} />
        <Stat label={`Planned revenue (live funnels)${k > 1 ? " · a year" : " · a month"}`} value={byCurrency(live.map((f) => ({ cur: curOf(f), v: (sum(f).rev ?? 0) * k })))} hint={`Profit ${byCurrency(live.map((f) => ({ cur: curOf(f), v: (sum(f).profit ?? 0) * k })))}`} />
        <Stat
          label={`Agency MRR${k > 1 ? " · a year" : ""}`}
          value={byCurrency(active.map((c) => ({ cur: c.currency, v: monthlyValue(c) * k })))}
          hint={`Client funnel MRR ${byCurrency(live.map((f) => ({ cur: curOf(f), v: (sum(f).mrr ?? 0) * k })))}`}
        />
      </section>

      {latest && (
        <section className="card mb-8 overflow-hidden" aria-labelledby="resume-h">
          <div className="grid items-stretch md:grid-cols-[minmax(0,320px)_1fr]">
            <GraphThumb graph={latest.graph} settings={latest.settings} name={latest.name} className="h-[150px] w-full border-b border-line md:h-full md:border-r md:border-b-0" />
            <div className="flex flex-col justify-center gap-1 p-5">
              <h2 id="resume-h" className="text-xs font-bold tracking-wider text-muted uppercase">
                Pick up where you left off
              </h2>
              <Link href={`/funnels/${latest.id}`} className="truncate font-display text-[22px] font-bold text-ink no-underline hover:text-brand">
                {latest.name}
              </Link>
              <p className="text-sm text-muted">
                {clientById[latest.client_id]?.name} · <StatusPill status={latest.status} /> · edited {timeAgo(latest.updated_at)}
              </p>
              <p className="text-sm">
                {sum(latest).rev == null ? <span className="text-muted">No data yet</span> : <>Plans {money(sum(latest).rev, curOf(latest))} revenue · ROAS {ratio(sum(latest).roas)}</>}
              </p>
              <div className="mt-2 flex gap-2">
                <Link href={`/funnels/${latest.id}`} className="btn primary sm">
                  Continue mapping
                </Link>
                <Link href={`/funnels/${latest.id}?view=reports`} className="btn sm">
                  Reports
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="recent-h">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="recent-h" className="font-display text-lg font-bold">
                Recent funnels
              </h2>
              <Link href="/funnels" className="text-sm text-brand no-underline hover:underline">
                All funnels →
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="card px-5 py-10 text-center text-sm text-muted">No funnels yet. Create a client, then map their first funnel.</p>
            ) : (
              <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 2xl:grid-cols-3">
                {recent.map((f) => (
                  <li key={f.id}>
                    <Link href={`/funnels/${f.id}`} className="card flex h-full flex-col overflow-hidden text-ink no-underline transition hover:border-brand">
                      <GraphThumb graph={f.graph} settings={f.settings} name={f.name} height={120} className="h-[120px] w-full border-b border-line" />
                      <div className="flex flex-1 flex-col gap-1 p-4">
                        <b className="truncate font-display text-[16px]" title={f.name}>
                          {f.name}
                        </b>
                        <span className="truncate text-[13px] text-muted">{clientById[f.client_id]?.name}</span>
                        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted">
                          <StatusPill status={f.status} />
                          <span>{money(sum(f).rev, curOf(f))}</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5" aria-labelledby="attn-h">
            <h2 id="attn-h" className="mb-3 font-display text-lg font-bold">
              Needs attention
            </h2>
            {attention.length === 0 ? (
              <p className="text-sm text-muted">Every funnel passes its checks.</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {attention.map(({ f, checks }) => (
                  <li key={f.id} className="border-b border-line py-2.5 text-sm last:border-0">
                    <Link href={`/funnels/${f.id}`} className="flex items-start gap-2 text-ink no-underline hover:text-brand">
                      <Icon name="alert" size={15} className="mt-0.5 shrink-0 text-attention" />
                      <span className="min-w-0">
                        <b className="block truncate">{f.name}</b>
                        <span className="block truncate text-muted">
                          {clientById[f.client_id]?.name} · {checks[0].text}
                          {checks.length > 1 && ` (+${checks.length - 1} more)`}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="card h-fit p-5" aria-labelledby="clients-h">
          <h2 id="clients-h" className="mb-3 font-display text-lg font-bold">
            Client pipeline
          </h2>
          {perClient.map(({ s, n }) => (
            <Link key={s} href={`/clients?status=${s}`} className="block border-b border-line py-2.5 text-sm last:border-0 hover:text-brand">
              <span className="flex items-center justify-between">
                <StatusPill status={s} />
                <b className="font-display text-base">{n}</b>
              </span>
              <span className="mt-1.5 block h-1 overflow-hidden rounded bg-line" aria-hidden="true">
                <span className="block h-full rounded bg-brand" style={{ width: `${(n / maxN) * 100}%` }} />
              </span>
            </Link>
          ))}
          <Link href="/clients" className="btn mt-4 w-full">
            All clients
          </Link>
        </section>
      </div>
    </div>
  );
}
