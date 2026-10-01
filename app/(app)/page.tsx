import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { NewFunnelButton } from "@/components/new-funnel-dialog";
import { PageHeader, Stat } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import type { FunnelSummary } from "@/lib/funnel-math";
import { money, moneyShort, ratio, timeAgo } from "@/lib/format";
import { templateOptions } from "@/lib/queries";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

/** Sums a value per currency and renders "£12.3k + $4k". */
function byCurrency(rows: { cur: string; v: number }[]) {
  const m = new Map<string, number>();
  rows.forEach((r) => m.set(r.cur, (m.get(r.cur) ?? 0) + (Number.isFinite(r.v) ? r.v : 0)));
  if (!m.size) return money(0);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => moneyShort(v, c)).join(" + ");
}

export default async function Dashboard() {
  const { sb, profile, workspace } = await requireUser();
  const [{ data: clients }, { data: funnels }, tpls] = await Promise.all([
    sb.from("clients").select("id, name, status, currency, monthly_retainer, logo_url").order("name"),
    sb.from("funnels").select("id, name, status, client_id, summary, settings, updated_at, thumbnail_url").order("updated_at", { ascending: false }),
    templateOptions(sb),
  ]);
  const cl = clients ?? [];
  const fs = funnels ?? [];
  const clientById = Object.fromEntries(cl.map((c) => [c.id, c]));
  const curOf = (f: (typeof fs)[number]) => ((f.settings as { currency?: string })?.currency ?? clientById[f.client_id]?.currency ?? workspace.default_currency);
  const sum = (f: (typeof fs)[number]) => (f.summary ?? {}) as Partial<FunnelSummary>;
  const active = cl.filter((c) => c.status === "active");
  const live = fs.filter((f) => f.status === "live");
  const pipeline = cl.filter((c) => c.status === "lead" || c.status === "proposal");
  const proposed = fs.filter((f) => f.status === "proposed");

  return (
    <>
      <PageHeader title={`Hi${profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`} sub={`${workspace.agency_name || "Layer2Funnels"} at a glance.`}>
        <Link className="btn" href="/clients/new">
          <Icon name="plus" /> New client
        </Link>
        <NewFunnelButton clients={cl.map((c) => ({ id: c.id, name: c.name }))} templates={tpls} />
      </PageHeader>

      <section aria-label="Totals" className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active clients" value={active.length} hint={`${pipeline.length} in the pipeline · ${cl.length} total`} />
        <Stat label="Live funnels" value={live.length} hint={`${proposed.length} proposed · ${fs.length} total`} />
        <Stat label="Planned revenue (live funnels)" value={byCurrency(live.map((f) => ({ cur: curOf(f), v: sum(f).rev ?? 0 })))} hint={`Profit ${byCurrency(live.map((f) => ({ cur: curOf(f), v: sum(f).profit ?? 0 })))}`} />
        <Stat
          label="Agency MRR (retainers)"
          value={byCurrency(active.map((c) => ({ cur: c.currency, v: Number(c.monthly_retainer) })))}
          hint={`Client funnel MRR ${byCurrency(live.map((f) => ({ cur: curOf(f), v: sum(f).mrr ?? 0 })))}`}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card overflow-hidden" aria-labelledby="recent-h">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 id="recent-h" className="font-display text-lg font-bold">
              Recent funnels
            </h2>
          </div>
          {fs.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">No funnels yet. Create a client, then map their first funnel.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="tbl text-sm">
                <thead>
                  <tr>
                    <th className="pl-5">Funnel</th>
                    <th className="hidden sm:table-cell">Client</th>
                    <th>Status</th>
                    <th className="r">Revenue</th>
                    <th className="r hidden md:table-cell">Profit</th>
                    <th className="r hidden md:table-cell">ROAS</th>
                    <th className="r hidden pr-5 sm:table-cell">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {fs.slice(0, 10).map((f) => (
                    <tr key={f.id}>
                      <td className="pl-5">
                        <Link href={`/funnels/${f.id}`} className="font-bold text-ink hover:text-brand">
                          {f.name}
                        </Link>
                      </td>
                      <td className="hidden sm:table-cell">
                        <Link href={`/clients/${f.client_id}`} className="text-muted hover:text-brand">
                          {clientById[f.client_id]?.name}
                        </Link>
                      </td>
                      <td>
                        <StatusPill status={f.status} />
                      </td>
                      <td className="r">{money(sum(f).rev, curOf(f))}</td>
                      <td className={`r hidden md:table-cell ${(sum(f).profit ?? 0) >= 0 ? "pos" : "neg"}`}>{money(sum(f).profit, curOf(f))}</td>
                      <td className="r hidden md:table-cell">{ratio(sum(f).roas)}</td>
                      <td className="r hidden pr-5 text-muted sm:table-cell">{timeAgo(f.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card p-5" aria-labelledby="clients-h">
          <h2 id="clients-h" className="mb-3 font-display text-lg font-bold">
            Clients by status
          </h2>
          {(["active", "proposal", "lead", "paused", "past"] as const).map((s) => {
            const n = cl.filter((c) => c.status === s).length;
            return (
              <Link key={s} href={`/clients?status=${s}`} className="flex items-center justify-between border-b border-line py-2.5 text-sm last:border-0 hover:text-brand">
                <StatusPill status={s} />
                <b className="font-display text-base">{n}</b>
              </Link>
            );
          })}
          <Link href="/clients" className="btn mt-4 w-full">
            All clients
          </Link>
        </section>
      </div>
    </>
  );
}
