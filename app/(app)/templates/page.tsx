import type { Metadata } from "next";
import { GraphThumb } from "@/components/graph-thumb";
import { NewFunnelButton } from "@/components/new-funnel-dialog";
import { PageHeader } from "@/components/page-header";
import { compute } from "@/lib/funnel-math";
import { money, ratio } from "@/lib/format";
import { parseGraph, parseSettings } from "@/lib/graph";
import { templateOptions } from "@/lib/queries";
import { requireUser } from "@/lib/supabase/server";
import { DeleteTemplate } from "./delete-template";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const { sb, isTeam } = await requireUser();
  const [{ data: templates }, { data: clients }, opts] = await Promise.all([
    sb.from("templates").select("*").order("owner_id", { nullsFirst: true }).order("created_at"),
    sb.from("clients").select("id, name").order("name"),
    templateOptions(sb, isTeam ? "Team templates" : "Your templates"),
  ]);
  const list = templates ?? [];
  const builtins = list.filter((t) => !t.owner_id);
  const mine = list.filter((t) => t.owner_id);
  const Card = ({ t }: { t: (typeof list)[number] }) => {
    const g = parseGraph(t.graph),
      s = parseSettings(t.settings);
    const R = compute(g, s);
    const value = t.builtin_key ? `builtin:${t.builtin_key}` : `template:${t.id}`;
    return (
      <li className="card flex flex-col overflow-hidden">
        <GraphThumb graph={t.graph} className="h-[160px] w-full border-b border-line" />
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 font-display text-[17px] font-bold">{t.name}</h3>
            <span className="pill bg-brand-soft text-brand">{t.category}</span>
          </div>
          {t.description && <p className="text-sm text-muted">{t.description}</p>}
          <p className="text-xs text-muted">
            {g.nodes.filter((n) => n.type !== "frame" && n.type !== "note" && n.type !== "label").length} blocks · plans {money(R.rev, s.currency)} revenue · ROAS {ratio(R.roas)}
          </p>
          <div className="mt-auto flex gap-2 pt-2">
            <NewFunnelButton clients={clients ?? []} templates={opts} defaultSource={value} label="Use template" className="btn primary sm" />
            {t.owner_id && <DeleteTemplate id={t.id} name={t.name} />}
          </div>
        </div>
      </li>
    );
  };
  return (
    <>
      <PageHeader title="Templates" sub="Start new funnels from proven layouts. Save any funnel as a template from the editor’s File menu." />
      <h2 className="mb-3 font-display text-xl font-bold">Built-in</h2>
      <ul className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {builtins.map((t) => (
          <Card key={t.id} t={t} />
        ))}
      </ul>
      <h2 className="mb-3 font-display text-xl font-bold">{isTeam ? "Team templates" : "Your templates"}</h2>
      {mine.length === 0 ? (
        <div className="card px-6 py-10 text-center text-sm text-muted">{isTeam ? "No team templates yet. Open any funnel, then File → Save as template. Everyone on the team can use them." : "No saved templates yet. Open any funnel, then File → Save as template."}</div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mine.map((t) => (
            <Card key={t.id} t={t} />
          ))}
        </ul>
      )}
    </>
  );
}
