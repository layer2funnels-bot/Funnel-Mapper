import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/supabase/server";
import { ClientsBrowser, type ClientListItem } from "./clients-browser";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  const sp = await searchParams;
  const { sb } = await requireUser();
  const [{ data: clients }, { data: funnels }] = await Promise.all([
    sb.from("clients").select("*").is("deleted_at", null).order("updated_at", { ascending: false }),
    sb.from("funnels").select("client_id, status").is("deleted_at", null),
  ]);
  const counts: Record<string, { total: number; live: number }> = {};
  (funnels ?? []).forEach((f) => {
    const c = (counts[f.client_id] ??= { total: 0, live: 0 });
    c.total++;
    if (f.status === "live") c.live++;
  });
  const items: ClientListItem[] = (clients ?? []).map((c) => ({ ...c, funnels: counts[c.id]?.total ?? 0, liveFunnels: counts[c.id]?.live ?? 0 }));
  return (
    <>
      <PageHeader title="Clients" sub={`${items.length} client${items.length === 1 ? "" : "s"} in your portfolio`}>
      </PageHeader>
      <ClientsBrowser clients={items} initialStatus={typeof sp.status === "string" ? sp.status : ""} initialQuery={typeof sp.q === "string" ? sp.q : ""} />
    </>
  );
}
