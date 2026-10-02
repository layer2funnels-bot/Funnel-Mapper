import { createClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { compute, summary } from "../../lib/funnel-math";
import { blankGraph, blankSettings, type FunnelGraph, type FunnelSettings } from "../../lib/graph";
import { builtinTemplate } from "../../lib/templates";

export function env(k: string) {
  if (process.env[k]) return process.env[k]!;
  for (const f of [".env.local", ".env.example"]) {
    try {
      const m = readFileSync(f, "utf8").match(new RegExp(`^${k}=(.*)$`, "m"));
      if (m) return m[1].trim();
    } catch {}
  }
  throw new Error(`missing ${k}`);
}

export const DEMO_CLIENT = "10000000-0000-4000-8000-000000000001";

/** Creates a funnel for the demo client straight through the API and returns its id. */
export async function createFunnel(opts: { template?: string; graph?: FunnelGraph; name?: string; settings?: Partial<FunnelSettings> } = {}) {
  const sb = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), { auth: { persistSession: false } });
  const { error: authErr } = await sb.auth.signInWithPassword({ email: "demo@layer2funnels.test", password: "demo-password" });
  if (authErr) throw authErr;
  const t = opts.template ? builtinTemplate(opts.template) : null;
  const graph = opts.graph ?? t?.graph ?? blankGraph();
  const settings = { ...blankSettings(), ...opts.settings };
  const { data, error } = await sb
    .from("funnels")
    .insert({ client_id: DEMO_CLIENT, name: opts.name ?? `E2E ${t?.name ?? "blank"} ${Date.now()}`, graph, settings, summary: summary(compute(graph, settings)) })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id as string, graph, sb };
}

export async function openEditor(page: Page, id: string) {
  await page.goto(`/funnels/${id}`);
  await expect(page.locator(".fm-editor")).toBeVisible();
  await expect(page.locator(".fm-saved")).toContainText(/Saved|View only/);
}

export const nodes = (page: Page) => page.locator(".react-flow__node");
export const node = (page: Page, name: string) => page.locator(".react-flow__node", { has: page.locator(".fm-ntitle span", { hasText: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }) });
export const edgeLabels = (page: Page) => page.locator(".fm-elabel");

/** Flow-space position of a node from React Flow's transform. */
export async function pos(page: Page, id: string) {
  const t = await page.locator(`.react-flow__node[data-id="${id}"]`).evaluate((el) => (el as HTMLElement).style.transform);
  const m = t.match(/translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px\)/)!;
  return { x: Number(m[1]), y: Number(m[2]) };
}

export async function waitSaved(page: Page) {
  await expect(page.locator(".fm-saved")).toHaveText(/Saved/, { timeout: 20_000 });
}

/** Drag with real pointer events (React Flow listens to mouse/pointer, not HTML5 DnD). */
export async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, opts: { shift?: boolean; steps?: number } = {}) {
  if (opts.shift) await page.keyboard.down("Shift");
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 5, from.y + 5, { steps: 2 });
  await page.mouse.move(to.x, to.y, { steps: opts.steps ?? 12 });
  await page.mouse.up();
  if (opts.shift) await page.keyboard.up("Shift");
}

export async function centre(page: Page, selector: string | ReturnType<Page["locator"]>) {
  const loc = typeof selector === "string" ? page.locator(selector) : selector;
  const b = (await loc.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
