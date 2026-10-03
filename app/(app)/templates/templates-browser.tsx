"use client";
import { useEffect, useState } from "react";
import { GraphThumb } from "@/components/graph-thumb";
import { Icon } from "@/components/icon";
import { NewFunnelButton, type TemplateOption } from "@/components/new-funnel-dialog";
import { DeleteTemplate } from "./delete-template";

export interface TemplateCard {
  id: string;
  name: string;
  category: string;
  description: string;
  value: string;
  mine: boolean;
  graph: unknown;
  blocks: number;
  revenue: string;
  roas: string;
  steps: string[];
}

/** Templates (V2): built-in and workspace templates, a preview panel, "Use template" and "Use for client". */
export function TemplatesBrowser({ cards, clients, options, canEdit, mineTitle }: { cards: TemplateCard[]; clients: { id: string; name: string }[]; options: TemplateOption[]; canEdit: boolean; mineTitle: string }) {
  const [sel, setSel] = useState<string | null>(null);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const cur = cards.find((c) => c.id === sel) ?? null;
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && setSel(null);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const item = (t: TemplateCard) => (
    <li key={t.id} className={`card flex flex-col overflow-hidden ${sel === t.id ? "border-brand!" : ""}`}>
      <button type="button" className="block w-full cursor-pointer border-0 bg-transparent p-0 text-left" aria-label={`Preview ${t.name}`} aria-pressed={sel === t.id} onClick={() => setSel(sel === t.id ? null : t.id)}>
        <GraphThumb graph={t.graph} className="h-[160px] w-full border-b border-line" />
      </button>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 font-display text-[17px] font-bold">{t.name}</h3>
          <span className="pill bg-brand-soft text-brand">{t.category}</span>
        </div>
        {t.description && <p className="text-sm text-muted">{t.description}</p>}
        <p className="text-xs text-muted">
          {t.blocks} blocks · plans {t.revenue} revenue · ROAS {t.roas}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <button type="button" className="btn sm" onClick={() => setSel(t.id)}>
            Preview
          </button>
          {canEdit && <NewFunnelButton clients={clients} templates={options} defaultSource={t.value} label="Use template" className="btn primary sm" />}
          {canEdit && t.mine && <DeleteTemplate id={t.id} name={t.name} />}
        </div>
      </div>
    </li>
  );
  const builtins = cards.filter((c) => !c.mine),
    mine = cards.filter((c) => c.mine);
  return (
    <div className={cur ? "xl:grid xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-6" : ""}>
      <div className="min-w-0">
        <h2 className="mb-3 font-display text-xl font-bold">Built-in</h2>
        <ul className="m-0 mb-10 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 2xl:grid-cols-3">{builtins.map(item)}</ul>
        <h2 className="mb-3 font-display text-xl font-bold">{mineTitle}</h2>
        {mine.length === 0 ? (
          <div className="card px-6 py-10 text-center text-sm text-muted">{mineTitle === "Team templates" ? "No team templates yet. Open any funnel, then File → Save as template. Everyone on the team can use them." : "No saved templates yet. Open any funnel, then File → Save as template."}</div>
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 2xl:grid-cols-3">{mine.map(item)}</ul>
        )}
      </div>
      {cur && (
        <aside className="fm-tplpanel" aria-label={`Preview: ${cur.name}`}>
          <div className="flex items-start gap-2">
            <h2 className="min-w-0 flex-1 font-display text-xl font-bold text-brand">{cur.name}</h2>
            <button type="button" className="btn icon ghost" aria-label="Close preview" onClick={() => setSel(null)}>
              <Icon name="close" />
            </button>
          </div>
          <GraphThumb graph={cur.graph} className="my-3 h-[200px] w-full rounded-xl border border-line" />
          {cur.description && <p className="text-sm text-muted">{cur.description}</p>}
          <dl className="my-3 grid grid-cols-3 gap-2 text-xs text-muted">
            <div>
              Blocks<b className="block font-display text-base text-ink">{cur.blocks}</b>
            </div>
            <div>
              Plans<b className="block font-display text-base text-ink">{cur.revenue}</b>
            </div>
            <div>
              ROAS<b className="block font-display text-base text-ink">{cur.roas}</b>
            </div>
          </dl>
          <h3 className="mb-1 text-xs font-bold tracking-wider text-muted uppercase">Steps</h3>
          <ol className="m-0 mb-4 max-h-[200px] list-decimal overflow-y-auto pl-5 text-sm">
            {cur.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          {canEdit && (
            <div className="grid gap-2">
              <NewFunnelButton clients={clients} templates={options} defaultSource={cur.value} label="Use template" className="btn primary w-full" />
              {clients.length > 0 && (
                <div className="flex gap-2">
                  <select className="input min-w-0 flex-1" aria-label="Client for this template" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <NewFunnelButton key={`${cur.id}-${clientId}`} clients={clients} clientId={clientId} templates={options} defaultSource={cur.value} label="Use for client" className="btn" />
                </div>
              )}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
