import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientForm } from "@/components/client-form";
import { Icon } from "@/components/icon";
import { ImportFunnelButton } from "@/components/import-funnel";
import { NewFunnelButton } from "@/components/new-funnel-dialog";
import { StatusPill } from "@/components/status-pill";
import { pricingSummary } from "@/lib/pricing";
import { templateOptions } from "@/lib/queries";
import { requireUser } from "@/lib/supabase/server";
import { updateClientAction } from "../../actions";
import { ClientLogo, ClientNotes, DeleteClient, FunnelList } from "./portfolio-bits";
import { ProductLibrary } from "./products";

export async function generateMetadata({ params }: PageProps<"/clients/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { sb } = await requireUser();
  const { data } = await sb.from("clients").select("name").eq("id", id).maybeSingle();
  return { title: data?.name ?? "Client" };
}

export default async function ClientPage({ params }: PageProps<"/clients/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { sb } = await requireUser();
  const [{ data: client }, { data: funnels }, { data: allClients }, tpls, { data: products }] = await Promise.all([
    sb.from("clients").select("*").eq("id", id).maybeSingle(),
    sb.from("funnels").select("id, name, description, status, summary, settings, graph, thumbnail_url, updated_at").eq("client_id", id).order("updated_at", { ascending: false }),
    sb.from("clients").select("id, name, niche").order("name"),
    templateOptions(sb),
    sb.from("products").select("*").or(`client_id.eq.${id},client_id.is.null`).order("name"),
  ]);
  if (!client) notFound();
  const update = updateClientAction.bind(null, client.id);
  const niches = [...new Set((allClients ?? []).map((c) => c.niche).filter(Boolean))];
  return (
    <>
      <Link href="/clients" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand">
        <Icon name="back" size={16} /> Clients
      </Link>
      <header className="mb-6 flex flex-wrap items-center gap-4">
        {client.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={client.logo_url} alt={`${client.name} logo`} className="h-14 w-14 rounded-2xl border border-line bg-white object-contain" />
        ) : (
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft font-display text-2xl font-bold text-brand">{client.name.slice(0, 1).toUpperCase()}</span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 font-display text-[28px] leading-tight font-bold tracking-tight">
            {client.name} <StatusPill status={client.status} />
          </h1>
          <p className="text-sm text-muted">
            {[client.business_name, client.niche, client.country].filter(Boolean).join(" · ") || "No details yet"}
            {pricingSummary(client, client.currency) && <> · {pricingSummary(client, client.currency)}</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {client.website && (
            <a className="btn" href={client.website} target="_blank" rel="noreferrer">
              <Icon name="link" /> Website
            </a>
          )}
          {client.email && (
            <a className="btn" href={`mailto:${client.email}`}>
              Email
            </a>
          )}
          <ImportFunnelButton clientId={client.id} />
          <NewFunnelButton clients={(allClients ?? []).map((c) => ({ id: c.id, name: c.name }))} clientId={client.id} templates={tpls} />
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="funnels-h">
            <h2 id="funnels-h" className="mb-3 font-display text-xl font-bold">
              Funnels <span className="text-base font-medium text-muted">({funnels?.length ?? 0})</span>
            </h2>
            <FunnelList funnels={funnels ?? []} currency={client.currency} />
          </section>
          <ProductLibrary clientId={client.id} products={products ?? []} currency={client.currency} />
        </div>
        <aside className="space-y-6">
          <section className="card p-5" aria-labelledby="logo-h">
            <h2 id="logo-h" className="mb-3 font-display text-lg font-bold">
              Logo
            </h2>
            <ClientLogo id={client.id} url={client.logo_url} />
            <p className="mt-2 text-xs text-muted">Shown on the share pages you send this client.</p>
          </section>
          <section className="card p-5" aria-labelledby="notes-h">
            <h2 id="notes-h" className="mb-3 font-display text-lg font-bold">
              Notes
            </h2>
            <ClientNotes id={client.id} notes={client.notes} />
          </section>
          <section className="card p-5" aria-labelledby="details-h">
            <h2 id="details-h" className="mb-3 font-display text-lg font-bold">
              Details
            </h2>
            <ClientForm action={update} client={client} niches={niches} submitLabel="Save details" />
          </section>
          <DeleteClient id={client.id} name={client.name} funnels={funnels?.length ?? 0} />
        </aside>
      </div>
    </>
  );
}
