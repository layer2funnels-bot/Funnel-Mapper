import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import type { FunnelSummary } from "@/lib/funnel-math";
import { parseGraph, parseSettings } from "@/lib/graph";
import { healthChecks } from "@/lib/health";
import { scenarioLabel } from "@/lib/scenario-label";
import { requireUser } from "@/lib/supabase/server";
import { FunnelsBrowser, type FunnelListItem } from "./funnels-browser";

export const metadata: Metadata = { title: "Funnels" };

export default async function FunnelsPage({ searchParams }: PageProps<"/funnels">) {
  const { sb, workspace } = await requireUser();
  const sp = await searchParams;
  const [{ data: funnels }, { data: clients }] = await Promise.all([
    sb.from("funnels").select("id, name, status, client_id, summary, settings, graph, updated_at").order("updated_at", { ascending: false }),
    sb.from("clients").select("id, name, currency, archived_at").order("name"),
  ]);
  const byClient = Object.fromEntries((clients ?? []).map((c) => [c.id, c]));
  const items: FunnelListItem[] = (funnels ?? [])
    .filter((f) => byClient[f.client_id])
    .map((f) => {
      const settings = parseSettings(f.settings);
      const sum = (f.summary ?? {}) as Partial<FunnelSummary>;
      return {
        id: f.id,
        name: f.name,
        status: f.status,
        clientId: f.client_id,
        client: byClient[f.client_id].name,
        currency: settings.currency || byClient[f.client_id].currency || workspace.default_currency,
        scenario: scenarioLabel(settings),
        rev: sum.rev ?? null,
        profit: sum.profit ?? null,
        roas: sum.roas ?? null,
        checks: healthChecks(parseGraph(f.graph)).length,
        updated: f.updated_at,
      };
    });
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  return (
    <>
      <PageHeader title="Funnels" sub="Every funnel in the workspace, with its numbers and health." />
      <FunnelsBrowser items={items} initialStatus={first(sp.status)} initialClient={first(sp.client)} initialAttention={first(sp.attention) === "1"} />
    </>
  );
}
