import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { compute } from "@/lib/funnel-math";
import { money, ratio } from "@/lib/format";
import { parseGraph, parseSettings } from "@/lib/graph";
import { templateOptions } from "@/lib/queries";
import { requireUser } from "@/lib/supabase/server";
import { isAnnot, typeOf } from "@/lib/catalog";
import { TemplatesBrowser, type TemplateCard } from "./templates-browser";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const { sb, isTeam, canEdit } = await requireUser();
  const [{ data: templates }, { data: clients }, opts] = await Promise.all([
    sb.from("templates").select("*").order("owner_id", { nullsFirst: true }).order("created_at"),
    sb.from("clients").select("id, name").is("deleted_at", null).order("name"),
    templateOptions(sb, isTeam ? "Team templates" : "Your templates"),
  ]);
  const list = templates ?? [];
  const cards: TemplateCard[] = list.map((t) => {
    const g = parseGraph(t.graph),
      s = parseSettings(t.settings);
    const R = compute(g, s);
    return {
      id: t.id,
      name: t.name,
      category: t.category,
      description: t.description ?? "",
      value: t.builtin_key ? `builtin:${t.builtin_key}` : `template:${t.id}`,
      mine: !!t.owner_id,
      graph: t.graph,
      settings: t.settings,
      blocks: g.nodes.filter((n) => typeOf(n.type) && !isAnnot(n.type)).length,
      revenue: money(R.rev, s.currency),
      roas: ratio(R.roas),
      steps: R.order.map((id) => g.nodes.find((n) => n.id === id)).filter((n): n is NonNullable<typeof n> => !!n && !isAnnot(n.type)).map((n) => n.name),
    };
  });
  return (
    <>
      <PageHeader title="Templates" sub="Start new funnels from proven layouts. Save any funnel as a template from the editor’s File menu." />
      <TemplatesBrowser cards={cards} clients={clients ?? []} options={opts} canEdit={canEdit} mineTitle={isTeam ? "Team templates" : "Your templates"} />
    </>
  );
}
