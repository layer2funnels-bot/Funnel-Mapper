"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { GraphThumb } from "@/components/graph-thumb";
import { Icon } from "@/components/icon";
import { LogoUpload } from "@/components/logo-upload";
import { StatusPill } from "@/components/status-pill";
import type { FunnelSummary } from "@/lib/funnel-math";
import { money, ratio, timeAgo } from "@/lib/format";
import { FUNNEL_STATUSES, STATUS_LABEL } from "@/lib/schemas";
import { archiveClientAction, deleteClientAction, deleteFunnelAction, duplicateFunnelAction, setFunnelStatusAction, updateClientFields } from "../../actions";

export function ClientLogo({ id, url }: { id: string; url: string | null }) {
  const [u, setU] = useState(url);
  return (
    <LogoUpload
      url={u}
      name={`client-${id}`}
      onChange={async (next) => {
        await updateClientFields(id, { logo_url: next });
        setU(next);
      }}
    />
  );
}

export function ClientNotes({ id, notes }: { id: string; notes: string }) {
  const [v, setV] = useState(notes);
  const [st, setSt] = useState<"" | "saving" | "saved" | "error">("");
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(t.current), []);
  return (
    <div className="field mb-0">
      <label htmlFor="client-notes" className="sr-only">
        Notes
      </label>
      <textarea
        id="client-notes"
        className="input min-h-[140px]!"
        value={v}
        placeholder="Goals, offers, call notes, access details…"
        onChange={(e) => {
          setV(e.target.value);
          setSt("saving");
          clearTimeout(t.current);
          const val = e.target.value;
          t.current = setTimeout(() => {
            updateClientFields(id, { notes: val })
              .then(() => setSt("saved"))
              .catch(() => setSt("error"));
          }, 800);
        }}
      />
      <span className="help" role="status">
        {st === "saving" ? "Saving…" : st === "saved" ? "Saved" : st === "error" ? "Couldn’t save. Check your connection." : "Saves automatically."}
      </span>
    </div>
  );
}

export function ArchiveClient({ id, archived }: { id: string; archived: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn" disabled={pending} onClick={() => start(() => archiveClientAction(id, !archived))} title={archived ? "Back to the active portfolio" : "Hide from the active portfolio and dashboard (nothing is deleted)"}>
      <Icon name="archive" /> {archived ? "Restore client" : "Archive client"}
    </button>
  );
}

export function DeleteClient({ id, name, funnels }: { id: string; name: string; funnels: number }) {
  const [pending, start] = useTransition();
  return (
    <section className="card p-5">
      <h2 className="mb-2 font-display text-lg font-bold">Danger zone</h2>
      <p className="mb-3 text-sm text-muted">Deleting a client also deletes their {funnels} funnel{funnels === 1 ? "" : "s"}, versions, actuals and share links.</p>
      <button
        type="button"
        className="btn danger"
        disabled={pending}
        onClick={() => {
          if (confirm(`Delete “${name}” and all their funnels? This can’t be undone.`)) start(() => deleteClientAction(id));
        }}
      >
        <Icon name="trash" /> Delete client
      </button>
    </section>
  );
}

type FunnelItem = { id: string; name: string; description: string; status: string; summary: unknown; settings: unknown; graph: unknown; thumbnail_url: string | null; updated_at: string };

export function FunnelList({ funnels, currency, canEdit = true }: { funnels: FunnelItem[]; currency: string; canEdit?: boolean }) {
  const [showArchived, setShowArchived] = useState(false);
  const archived = funnels.filter((f) => f.status === "archived").length;
  const list = funnels.filter((f) => showArchived || f.status !== "archived");
  if (!funnels.length) return <div className="card px-6 py-12 text-center text-sm text-muted">{canEdit ? "No funnels yet. Use “New funnel” to start from a template or a blank canvas." : "No funnels yet."}</div>;
  return (
    <>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="Funnels">
        {list.map((f) => (
          <FunnelCard key={f.id} f={f} canEdit={canEdit} currency={(f.settings as { currency?: string })?.currency ?? currency} />
        ))}
      </ul>
      {archived > 0 && (
        <button type="button" className="btn ghost mt-3" onClick={() => setShowArchived((s) => !s)}>
          <Icon name="archive" /> {showArchived ? "Hide" : "Show"} {archived} archived
        </button>
      )}
    </>
  );
}

function FunnelCard({ f, currency, canEdit }: { f: FunnelItem; currency: string; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const s = (f.summary ?? {}) as Partial<FunnelSummary>;
  return (
    <li className={`card flex flex-col overflow-hidden ${pending ? "opacity-60" : ""}`}>
      <Link href={`/funnels/${f.id}`} className="block border-b border-line" aria-label={`Open ${f.name}`}>
        {/* live map thumbnail: always current, works in light and dark */}
        <GraphThumb graph={f.graph} className="h-[150px] w-full" />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-2">
          <Link href={`/funnels/${f.id}`} className="min-w-0 flex-1 font-display text-[17px] leading-snug font-bold text-ink hover:text-brand">
            {f.name}
          </Link>
          <StatusPill status={f.status} />
        </div>
        <dl className="grid grid-cols-4 gap-2 rounded-xl bg-bg px-3 py-2 text-xs text-muted">
          <div>
            <dt>Revenue</dt>
            <dd className="font-display text-[14px] font-bold text-ink">{money(s.rev, currency)}</dd>
          </div>
          <div>
            <dt>Profit</dt>
            <dd className={`font-display text-[14px] font-bold ${(s.profit ?? 0) >= 0 ? "pos" : "neg"}`}>{money(s.profit, currency)}</dd>
          </div>
          <div>
            <dt>ROAS</dt>
            <dd className="font-display text-[14px] font-bold text-ink">{ratio(s.roas)}</dd>
          </div>
          <div>
            <dt>CPA</dt>
            <dd className="font-display text-[14px] font-bold text-ink">{money(s.cpa, currency)}</dd>
          </div>
        </dl>
        <div className="mt-auto flex flex-wrap items-center gap-2">
          <span className="mr-auto text-xs text-muted">Updated {timeAgo(f.updated_at)}</span>
          <Link href={`/funnels/${f.id}?view=reports`} className="btn sm" aria-label={`Reports for ${f.name}`} title="Reports">
            <Icon name="chart" size={16} />
            <span className="sr-only md:not-sr-only">Reports</span>
          </Link>
          {canEdit && (
          <>
          <label className="sr-only" htmlFor={`st-${f.id}`}>
            Status
          </label>
          <select id={`st-${f.id}`} className="input min-h-[30px]! w-auto py-1! text-[13px]" value={f.status} disabled={pending} onChange={(e) => start(() => setFunnelStatusAction(f.id, e.target.value))}>
            {FUNNEL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button type="button" className="btn sm icon" title="Duplicate" aria-label={`Duplicate ${f.name}`} disabled={pending} onClick={() => start(() => duplicateFunnelAction(f.id))}>
            <Icon name="copy" size={16} />
          </button>
          {f.status !== "archived" && (
            <button type="button" className="btn sm icon" title="Archive" aria-label={`Archive ${f.name}`} disabled={pending} onClick={() => start(() => setFunnelStatusAction(f.id, "archived"))}>
              <Icon name="archive" size={16} />
            </button>
          )}
          <button
            type="button"
            className="btn sm icon danger"
            title="Delete"
            aria-label={`Delete ${f.name}`}
            disabled={pending}
            onClick={() => {
              if (confirm(`Delete “${f.name}”? Versions, actuals and share links go with it. This can’t be undone.`)) start(() => deleteFunnelAction(f.id));
            }}
          >
            <Icon name="trash" size={16} />
          </button>
          </>
          )}
        </div>
      </div>
    </li>
  );
}
