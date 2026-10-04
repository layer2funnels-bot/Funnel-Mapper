"use client";
import { TimeAgo } from "@/components/time-ago";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { StatusPill } from "@/components/status-pill";
import { isNeg, money, ratio } from "@/lib/format";
import { FUNNEL_STATUSES, STATUS_LABEL } from "@/lib/schemas";

export interface FunnelListItem {
  id: string;
  name: string;
  status: string;
  clientId: string;
  client: string;
  currency: string;
  scenario: string;
  rev: number | null;
  profit: number | null;
  roas: number | null;
  checks: number;
  updated: string;
}

/** All funnels (V2): status views, client filter, "needs attention", recently updated. Numbers are the saved engine summary. */
export function FunnelsBrowser({ items, initialStatus = "", initialClient = "", initialAttention = false }: { items: FunnelListItem[]; initialStatus?: string; initialClient?: string; initialAttention?: boolean }) {
  const [status, setStatus] = useState(initialStatus === "all" ? "" : initialStatus);
  const [client, setClient] = useState(initialClient);
  const [attention, setAttention] = useState(initialAttention);
  const [recent, setRecent] = useState(false);
  const [q, setQ] = useState("");
  const clients = useMemo(() => [...new Map(items.map((f) => [f.clientId, f.client])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [items]);
  const count = (s: string) => items.filter((f) => !s || f.status === s).length;
  const [week] = useState(() => Date.now() - 7 * 86400000);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items
      .filter((f) => (!status || f.status === status) && (!client || f.clientId === client) && (!attention || f.checks > 0) && (!recent || Date.parse(f.updated) >= week) && (!s || `${f.name} ${f.client}`.toLowerCase().includes(s)))
      // archived funnels only show in their own view
      .filter((f) => status === "archived" || f.status !== "archived" || !!status);
  }, [items, status, client, attention, recent, q, week]);
  const views: [string, string][] = [["", "All"], ...FUNNEL_STATUSES.map((s) => [s, STATUS_LABEL[s]] as [string, string])];
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="seg fm-scroll-x" role="group" aria-label="Funnel status">
          {views.map(([k, l]) => (
            <button key={k} type="button" aria-pressed={status === k} onClick={() => setStatus(k)}>
              {l} <span className="text-muted">{count(k)}</span>
            </button>
          ))}
        </div>
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Search funnels</span>
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input className="input pl-10" type="search" placeholder="Search funnels or clients…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="input w-auto" aria-label="Filter by client" value={client} onChange={(e) => setClient(e.target.value)}>
          <option value="">All clients</option>
          {clients.map(([id, n]) => (
            <option key={id} value={id}>
              {n}
            </option>
          ))}
        </select>
        <button type="button" className="btn" aria-pressed={attention} onClick={() => setAttention((a) => !a)}>
          <Icon name="alert" size={15} /> Needs attention
        </button>
        <button type="button" className="btn" aria-pressed={recent} onClick={() => setRecent((r) => !r)}>
          Updated this week
        </button>
      </div>
      {list.length === 0 ? (
        <div className="card px-6 py-14 text-center text-muted">{items.length ? "No funnels match those filters." : "No funnels yet. Create a client, then map their first funnel."}</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl text-sm fm-funnels">
            <thead>
              <tr>
                <th className="pl-4">Funnel</th>
                <th className="fm-c-client">Client</th>
                <th className="fm-c-status">Status</th>
                <th className="fm-c-scen">Scenario</th>
                <th className="r">Revenue</th>
                <th className="r fm-c-profit">Profit</th>
                <th className="r fm-c-roas">ROAS</th>
                <th>Health</th>
                <th className="r pr-4 fm-c-upd">Updated</th>
              </tr>
            </thead>
            <tbody>
              {list.map((f) => (
                <tr key={f.id}>
                  <td className="pl-4">
                    <Link href={`/funnels/${f.id}`} className="block max-w-[260px] truncate font-bold text-ink hover:text-brand" title={f.name}>
                      {f.name}
                    </Link>
                    <span className="fm-c-client2 max-w-[260px] truncate text-xs text-muted">
                      {f.client}<span className="fm-c-st2"> · {f.status}</span>
                    </span>
                  </td>
                  <td className="fm-c-client">
                    <Link href={`/clients/${f.clientId}`} className="block max-w-[180px] truncate text-muted hover:text-brand" title={f.client}>
                      {f.client}
                    </Link>
                  </td>
                  <td className="fm-c-status">
                    <StatusPill status={f.status} />
                  </td>
                  <td className="fm-c-scen text-muted">{f.scenario}</td>
                  <td className="r">{f.rev == null ? <span className="text-muted">No data yet</span> : money(f.rev, f.currency)}</td>
                  <td className={`r fm-c-profit${isNeg(f.profit) ? " neg" : ""}`}>{f.profit == null ? <span className="text-muted">No data yet</span> : money(f.profit, f.currency)}</td>
                  <td className="r fm-c-roas">{f.roas == null ? <span className="text-muted">–</span> : ratio(f.roas)}</td>
                  <td>
                    {f.checks > 0 ? (
                      <Link href={`/funnels/${f.id}`} className="fm-health-pill warn" title="Open the funnel to see the checks">
                        <Icon name="alert" size={13} /> {f.checks}<span className="fm-hp-label"> {f.checks === 1 ? "check" : "checks"}</span>
                      </Link>
                    ) : (
                      <span className="fm-health-pill ok">
                        <Icon name="check" size={13} aria-hidden="true" /> <span className="fm-hp-label">Healthy</span>
                      </span>
                    )}
                  </td>
                  <td className="r pr-4 fm-c-upd text-muted"><TimeAgo iso={f.updated} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
