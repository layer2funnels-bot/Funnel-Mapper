"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { compute, summary } from "@/lib/funnel-math";
import { blankGraph, blankSettings, isCurrency, parseGraph, parseSettings, type CurrencyCode } from "@/lib/graph";
import { clientFormSchema, FUNNEL_STATUSES, profileFormSchema } from "@/lib/schemas";
import { requireUser } from "@/lib/supabase/server";
import { builtinTemplate, reidGraph } from "@/lib/templates";

export type ActionResult = { error?: string; ok?: boolean; id?: string } | undefined;
const uuid = z.uuid();
const newId = () => "n" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);

function formObject(fd: FormData) {
  const o: Record<string, FormDataEntryValue> = {};
  fd.forEach((v, k) => (o[k] = v));
  return o;
}

/* ---------------- clients ---------------- */
export async function createClientAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { sb, user } = await requireUser();
  const p = clientFormSchema.safeParse(formObject(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const { data, error } = await sb.from("clients").insert({ ...p.data, owner_id: user.id }).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/clients");
  revalidatePath("/");
  redirect(`/clients/${data.id}`);
}

export async function updateClientAction(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const { sb } = await requireUser();
  if (!uuid.safeParse(id).success) return { error: "Unknown client" };
  const p = clientFormSchema.safeParse(formObject(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const { error } = await sb.from("clients").update(p.data).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
  return { ok: true };
}

export async function updateClientFields(id: string, fields: { notes?: string; logo_url?: string | null; status?: string }) {
  const { sb } = await requireUser();
  const p = clientFormSchema.pick({ notes: true, status: true }).partial().extend({ logo_url: z.url().nullable().optional() }).parse(fields);
  const { error } = await sb.from("clients").update(p).eq("id", uuid.parse(id));
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
}

export async function deleteClientAction(id: string) {
  const { sb } = await requireUser();
  const { error } = await sb.from("clients").delete().eq("id", uuid.parse(id));
  if (error) throw new Error(error.message);
  revalidatePath("/clients");
  revalidatePath("/");
  redirect("/clients");
}

/* ---------------- funnels ---------------- */
const newFunnelSchema = z.object({
  client_id: z.uuid("Pick a client"),
  name: z.string().trim().max(160).optional(),
  source: z.string().default("blank"), // "blank" | "builtin:<key>" | "template:<uuid>"
});

export async function createFunnelAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { sb, user } = await requireUser();
  const p = newFunnelSchema.safeParse(formObject(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const { data: client } = await sb.from("clients").select("id, currency").eq("id", p.data.client_id).single();
  if (!client) return { error: "Client not found" };
  const currency: CurrencyCode = isCurrency(client.currency) ? client.currency : "GBP";
  let graph = blankGraph(),
    settings = blankSettings(currency),
    name = "Untitled funnel",
    description = "";
  if (p.data.source.startsWith("builtin:")) {
    const t = builtinTemplate(p.data.source.slice(8));
    graph = reidGraph(t.graph, newId);
    name = t.name;
    description = t.description;
  } else if (p.data.source.startsWith("template:")) {
    const { data: t } = await sb.from("templates").select("*").eq("id", uuid.parse(p.data.source.slice(9))).single();
    if (!t) return { error: "Template not found" };
    graph = reidGraph(parseGraph(t.graph), newId);
    settings = { ...parseSettings(t.settings), currency };
    name = t.name;
    description = t.description;
  }
  if (p.data.name) name = p.data.name;
  const { data, error } = await sb
    .from("funnels")
    .insert({ client_id: client.id, owner_id: user.id, name, description, graph: graph as never, settings: settings as never, summary: summary(compute(graph, settings)) as never })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath(`/clients/${client.id}`);
  redirect(`/funnels/${data.id}`);
}

export async function duplicateFunnelAction(id: string) {
  const { sb, user } = await requireUser();
  const { data: f } = await sb.from("funnels").select("*").eq("id", uuid.parse(id)).single();
  if (!f) throw new Error("Funnel not found");
  const graph = reidGraph(parseGraph(f.graph), newId);
  const { error } = await sb.from("funnels").insert({
    client_id: f.client_id,
    owner_id: user.id,
    name: `${f.name} (copy)`,
    description: f.description,
    status: "draft",
    graph: graph as never,
    settings: f.settings,
    summary: f.summary,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${f.client_id}`);
}

export async function setFunnelStatusAction(id: string, status: string) {
  const { sb } = await requireUser();
  const s = z.enum(FUNNEL_STATUSES).parse(status);
  const { data, error } = await sb.from("funnels").update({ status: s }).eq("id", uuid.parse(id)).select("client_id").single();
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${data.client_id}`);
  revalidatePath("/");
}

export async function deleteFunnelAction(id: string) {
  const { sb } = await requireUser();
  const { data, error } = await sb.from("funnels").delete().eq("id", uuid.parse(id)).select("client_id").single();
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${data.client_id}`);
  revalidatePath("/");
}

/* ---------------- templates ---------------- */
export async function deleteTemplateAction(id: string) {
  const { sb } = await requireUser();
  const { error } = await sb.from("templates").delete().eq("id", uuid.parse(id));
  if (error) throw new Error(error.message);
  revalidatePath("/templates");
}

/* ---------------- profile ---------------- */
export async function updateProfileAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { sb, user } = await requireUser();
  const p = profileFormSchema.safeParse(formObject(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const { error } = await sb.from("profiles").update(p.data).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateAgencyLogo(url: string | null) {
  const { sb, user } = await requireUser();
  const { error } = await sb.from("profiles").update({ agency_logo_url: z.url().nullable().parse(url) }).eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/* ---------------- products (reusable offers) ---------------- */
const OFFER_TYPES = ["checkout", "product", "bump", "upsell", "downsell", "sub", "trial", "plan", "hightick"] as const;
const productSchema = z.object({
  id: z.uuid().optional(),
  client_id: z.uuid().nullable(),
  name: z.string().trim().min(1, "Name the product").max(120),
  type: z.enum(OFFER_TYPES),
  notes: z.string().max(2000).default(""),
  params: z.object({
    price: z.number().min(0).default(0),
    cr: z.number().min(0).max(100).default(10),
    newc: z.boolean().default(false),
    disc: z.number().min(0).max(100).default(0),
    refund: z.number().min(0).max(100).default(0),
    fulfil: z.number().min(0).default(0),
    aff: z.number().min(0).max(100).default(0),
    interval: z.enum(["weekly", "monthly", "quarterly", "yearly"]).optional(),
    life: z.number().min(0).optional(),
    trialDays: z.number().min(0).optional(),
    trialPrice: z.number().min(0).optional(),
    setup: z.number().min(0).optional(),
    pays: z.number().int().min(1).optional(),
  }),
});
export type ProductInput = z.input<typeof productSchema>;

export async function saveProductAction(input: ProductInput): Promise<ActionResult> {
  const { sb, user } = await requireUser();
  const p = productSchema.safeParse(input);
  if (!p.success) return { error: p.error.issues[0].message };
  const { id, ...row } = p.data;
  const q = id ? sb.from("products").update(row).eq("id", id) : sb.from("products").insert({ ...row, owner_id: user.id });
  const { error } = await q;
  if (error) return { error: error.message };
  if (row.client_id) revalidatePath(`/clients/${row.client_id}`);
  return { ok: true };
}

export async function deleteProductAction(id: string, clientId: string | null) {
  const { sb } = await requireUser();
  const { error } = await sb.from("products").delete().eq("id", uuid.parse(id));
  if (error) throw new Error(error.message);
  if (clientId) revalidatePath(`/clients/${clientId}`);
}
