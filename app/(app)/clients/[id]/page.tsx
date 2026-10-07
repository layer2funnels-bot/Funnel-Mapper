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
import { ClientTabs } from "./client-tabs";
import { ArchiveClient, ClientLogo, ClientNotes, DeleteClient, FunnelList } from "./portfolio-bits";
import { ProductLibrary } from "./products";

export async function generateMetadata({ params }: PageProps<"/clients/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { sb } = await requireUser();
  const { data } = await sb.from("clients").select("name").eq("id", id).maybeSingle();
  return { title: data?.name ?? "Client" };
}

export default async function ClientPage({ params, searchParams }: PageProps<"/clients/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = String(Array.isArray(sp.tab) ? sp.tab[0] : (sp.tab ?? "funnels"));
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { sb, isTeam, canEdit } = await requireUser();
  const [{ data: client }, { data: funnelRows }, { data: allClients }, tpls, { data: products }] = await Promise.all([
    sb.from("clients").select("*").eq("id", id).maybeSingle(),
    sb.from("funnels").select("id, name, description, status, summary, settings, thumbnail_url, updated_at").eq("client_id", id).order("updated_at", { ascending: false }),
    sb.from("clients").select("id, name, niche").order("name"),
    templateOptions(sb, isTeam ? "Team templates" : "Your templates"),
    sb.from("products").select("*").or(`client_id.eq.${id},client_id.is.null`).order("name"),
  ]);
  if (!client) notFound();
  // A client can have hundreds of funnels. Each card draws its whole map, so the page shows the most recently updated ones and loads
  // the maps (the heavy part) only for those, unless asked for all of them.
  const PAGE = 24;
  const showAll = String(Array.isArray(sp.all) ? sp.all[0] : (sp.all ?? "")) === "1";
  const rows = funnelRows ?? [];
  const live = rows.filter((f) => f.status !== "archived"),
    archivedRows = rows.filter((f) => f.status === "archived");
  const picked = showAll ? rows : [...live.slice(0, PAGE), ...archivedRows.slice(0, PAGE)];
  const graphQ = showAll ? sb.from("funnels").select("id, graph").eq("client_id", id) : sb.from("funnels").select("id, graph").in("id", picked.map((f) => f.id));
  const { data: graphRows } = picked.length ? await graphQ : { data: [] as { id: string; graph: unknown }[] };
  const graphs = new Map((graphRows ?? []).map((g) => [g.id, g.graph]));
  const funnels = picked.map((f) => ({ ...f, graph: graphs.get(f.id) ?? null }));
  const hiddenFunnels = showAll ? 0 : Math.max(0, live.length - PAGE) + Math.max(0, archivedRows.length - PAGE);
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
            {client.archived_at && <span className="pill st-past">Archived</span>}
          </h1>
          <p className="text-sm text-muted">
            {[client.business_name, client.niche, client.country].filter(Boolean).join(" · ") || "No details yet"}
            {pricingSummary(client, client.currency) && <> · {pricingSummary(client, client.currency)}</>}
          </p>
          {client.tags.length > 0 && (
            <p className="mt-1 flex flex-wrap gap-1">
              {client.tags.map((t) => (
                <span key={t} className="pill bg-brand-soft text-brand">
                  #{t}
                </span>
              ))}
            </p>
          )}
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
          {canEdit && <ArchiveClient id={client.id} archived={!!client.archived_at} />}
          {canEdit && <ImportFunnelButton clientId={client.id} />}
          {canEdit && <NewFunnelButton clients={(allClients ?? []).map((c) => ({ id: c.id, name: c.name }))} clientId={client.id} templates={tpls} />}
        </div>
      </header>

      <ClientTabs
        initial={tab}
        tabs={[
          {
            key: "funnels",
            label: "Funnels",
            count: rows.length,
            content: (
              <section aria-labelledby="funnels-h">
                <h2 id="funnels-h" className="sr-only">
                  Funnels
                </h2>
                <FunnelList funnels={funnels} currency={client.currency} canEdit={canEdit} hidden={hiddenFunnels} total={rows.length} allHref={`/clients/${client.id}?tab=funnels&all=1`} />
              </section>
            ),
          },
          { key: "products", label: "Products", count: products?.length ?? 0, content: <ProductLibrary clientId={client.id} products={products ?? []} currency={client.currency} readOnly={!canEdit} /> },
          {
            key: "notes",
            label: "Notes",
            content: (
              <fieldset disabled={!canEdit} className="m-0 min-w-0 border-0 p-0">
                <section className="card max-w-[820px] p-5" aria-labelledby="notes-h">
                  <h2 id="notes-h" className="mb-3 font-display text-lg font-bold">
                    Notes
                  </h2>
                  <ClientNotes id={client.id} notes={client.notes} />
                </section>
              </fieldset>
            ),
          },
          {
            key: "details",
            label: "Details",
            content: (
              /* viewers see the same panels, read-only (RLS refuses their writes anyway) */
              <fieldset disabled={!canEdit} className="m-0 min-w-0 space-y-6 border-0 p-0" aria-label={canEdit ? undefined : "Client details (read-only)"}>
                <div className="grid max-w-[1000px] gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                  <section className="card h-fit p-5" aria-labelledby="logo-h">
                    <h2 id="logo-h" className="mb-3 font-display text-lg font-bold">
                      Logo
                    </h2>
                    <ClientLogo id={client.id} url={client.logo_url} />
                    <p className="mt-2 text-xs text-muted">Shown on the share pages you send this client.</p>
                  </section>
                  <section className="card p-5" aria-labelledby="details-h">
                    <h2 id="details-h" className="mb-3 font-display text-lg font-bold">
                      Details
                    </h2>
                    <ClientForm action={update} client={client} niches={niches} submitLabel="Save details" />
                  </section>
                </div>
                {canEdit && <DeleteClient id={client.id} name={client.name} funnels={rows.length} />}
              </fieldset>
            ),
          },
        ]}
      />
    </>
  );
}
