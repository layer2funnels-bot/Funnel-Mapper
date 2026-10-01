// Workspace access rules (RLS), storage privacy and share-link RPCs against the local Supabase stack.
// Requires `npx supabase start` and `npx supabase db reset` (seed). Run: npm run test:db
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const mk = () => createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
const signIn = async (email: string) => {
  const c = mk();
  const { error } = await c.auth.signInWithPassword({ email, password: "demo-password" });
  expect(error, email).toBeNull();
  return c;
};

const SAM = "10000000-0000-4000-8000-000000000001";
const TRIPWIRE = "20000000-0000-4000-8000-000000000001";
const WEBINAR = "20000000-0000-4000-8000-000000000003";
const TABLES = ["clients", "funnels", "funnel_versions", "funnel_actuals", "share_links", "products", "share_comments", "templates", "profiles"] as const;

let admin: SupabaseClient, mate: SupabaseClient, former: SupabaseClient, anon: SupabaseClient;

beforeAll(async () => {
  admin = await signIn("demo@layer2funnels.test");
  mate = await signIn("teammate@layer2funnels.test");
  former = await signIn("former@layer2funnels.test");
  anon = mk();
});

describe("private access", () => {
  it("public sign-up is disabled", async () => {
    const { data, error } = await mk().auth.signUp({ email: `stranger-${Date.now()}@example.test`, password: "stranger-password-1" });
    expect(error).not.toBeNull();
    expect(data.user).toBeNull();
  });
  it("magic links don't create accounts for unknown emails", async () => {
    const { error } = await mk().auth.signInWithOtp({ email: `stranger-${Date.now()}@example.test`, options: { shouldCreateUser: false } });
    expect(error).not.toBeNull();
  });
  it("anonymous visitors can't read any table", async () => {
    for (const t of TABLES) {
      const { data } = await anon.from(t).select("id");
      expect(data ?? [], t).toEqual([]);
    }
  });
  it("a deactivated member sees nothing and can't write", async () => {
    for (const t of TABLES) {
      const { data } = await former.from(t).select("id");
      expect(data ?? [], t).toEqual([]);
    }
    const { error } = await former.from("clients").insert({ name: "sneaky" });
    expect(error).not.toBeNull();
  });
});

describe("shared workspace", () => {
  it("every active teammate sees the same portfolio", async () => {
    const a = await admin.from("clients").select("id").order("id");
    const m = await mate.from("clients").select("id").order("id");
    expect(a.data!.length).toBeGreaterThanOrEqual(4);
    expect(m.data).toEqual(a.data);
    const f = await mate.from("funnels").select("id");
    expect(f.data!.length).toBeGreaterThanOrEqual(5);
  });
  it("a teammate can edit and create in the shared workspace", async () => {
    const u = await mate.from("clients").update({ notes: "Edited by teammate" }).eq("id", SAM).select("notes").single();
    expect(u.error).toBeNull();
    expect(u.data!.notes).toBe("Edited by teammate");
    const c = await mate.from("clients").insert({ name: `Teammate client ${Date.now()}` }).select("id, owner_id").single();
    expect(c.error).toBeNull();
    const seen = await admin.from("clients").select("id").eq("id", c.data!.id);
    expect(seen.data!.length).toBe(1);
    await admin.from("clients").delete().eq("id", c.data!.id);
  });
  it("team templates are shared; built-in templates can't be changed", async () => {
    const t = await mate.from("templates").insert({ owner_id: (await mate.auth.getUser()).data.user!.id, name: "Team tpl", graph: { nodes: [], edges: [] } }).select("id").single();
    expect(t.error).toBeNull();
    const seen = await admin.from("templates").select("id").eq("id", t.data!.id);
    expect(seen.data!.length).toBe(1);
    await admin.from("templates").delete().eq("id", t.data!.id);
    const b = await mate.from("templates").select("builtin_key").not("builtin_key", "is", null);
    expect(b.data!.length).toBe(5);
    const u = await admin.from("templates").update({ name: "x" }).not("builtin_key", "is", null).select();
    expect(u.data).toEqual([]);
    const d = await admin.from("templates").delete().not("builtin_key", "is", null).select();
    expect(d.data).toEqual([]);
  });
  it("teammates see each other's profiles (names) but members can't promote themselves", async () => {
    const { data } = await mate.from("profiles").select("email, role, active");
    expect(data!.map((p) => p.email).sort()).toContain("demo@layer2funnels.test");
    const me = (await mate.auth.getUser()).data.user!.id;
    const { error } = await mate.from("profiles").update({ role: "admin" }).eq("id", me);
    expect(error).not.toBeNull();
    const ok = await mate.from("profiles").update({ full_name: "Teammate T." }).eq("id", me).select("full_name").single();
    expect(ok.data!.full_name).toBe("Teammate T.");
    // members can't touch other people's profiles
    const other = await mate.from("profiles").update({ full_name: "x" }).eq("email", "demo@layer2funnels.test").select();
    expect(other.data).toEqual([]);
  });
  it("admins can deactivate and reactivate members", async () => {
    const id = "00000000-0000-4000-8000-000000000002";
    const off = await admin.from("profiles").update({ active: false }).eq("id", id).select("active").single();
    expect(off.data!.active).toBe(false);
    const { data } = await mate.from("clients").select("id");
    expect(data).toEqual([]);
    await admin.from("profiles").update({ active: true }).eq("id", id);
    const back = await mate.from("clients").select("id");
    expect(back.data!.length).toBeGreaterThan(0);
  });
  it("the last admin can't demote themselves", async () => {
    const me = (await admin.auth.getUser()).data.user!.id;
    const { error } = await admin.from("profiles").update({ role: "member" }).eq("id", me);
    expect(error).not.toBeNull();
  });
});

describe("storage", () => {
  it("thumbnails and screenshots are private to the team; logos are public", async () => {
    const png = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" });
    const path = `test/${Date.now()}.png`;
    const up = await mate.storage.from("screenshots").upload(path, png, { contentType: "image/png" });
    expect(up.error).toBeNull();
    const signed = await admin.storage.from("screenshots").createSignedUrl(path, 60);
    expect(signed.error).toBeNull();
    const pub = await fetch(`${URL}/storage/v1/object/public/screenshots/${path}`);
    expect(pub.ok).toBe(false);
    const anonDl = await anon.storage.from("screenshots").download(path);
    expect(anonDl.error).not.toBeNull();
    const formerDl = await former.storage.from("screenshots").download(path);
    expect(formerDl.error).not.toBeNull();
    await admin.storage.from("screenshots").remove([path]);
    const buckets = await fetch(`${URL}/storage/v1/object/public/logos/does-not-exist.png`);
    expect(buckets.status).not.toBe(403);
  });
});

describe("share links", () => {
  it("valid token returns the funnel, branding and comments", async () => {
    const { data, error } = await anon.rpc("get_shared_funnel", { p_token: "demo-share-token" });
    expect(error).toBeNull();
    expect(data.funnel.name).toBe("PT tripwire funnel");
    expect(data.agency.name).toBe("Layer2Funnels");
    expect(data.client.name).toBe("Sam Carter");
  });
  let original: unknown;
  afterAll(async () => {
    if (original) await admin.from("funnels").update({ graph: original }).eq("id", TRIPWIRE);
  });
  it("internal block notes and screenshots never leave the database", async () => {
    const f = await admin.from("funnels").select("graph").eq("id", TRIPWIRE).single();
    original = structuredClone(f.data!.graph);
    const g = f.data!.graph as { nodes: Record<string, unknown>[] };
    g.nodes[2] = { ...g.nodes[2], desc: "INTERNAL: client is price sensitive", shot: "screens/x.png" };
    await admin.from("funnels").update({ graph: g }).eq("id", TRIPWIRE);
    const { data } = await anon.rpc("get_shared_funnel", { p_token: "demo-share-token" });
    const s = JSON.stringify(data);
    expect(s).not.toContain("INTERNAL");
    expect(s).not.toContain("screens/x.png");
    data.funnel.graph.nodes.forEach((n: Record<string, unknown>) => {
      expect(n.desc).toBeUndefined();
      expect(n.shot).toBeUndefined();
    });
  });
  it("saving from an editable link keeps the internal notes", async () => {
    const ins = await admin.from("share_links").insert({ funnel_id: TRIPWIRE, can_edit: true }).select("token").single();
    const { data } = await anon.rpc("get_shared_funnel", { p_token: ins.data!.token });
    expect(data.link.can_edit).toBe(true);
    data.funnel.graph.nodes[2].name = "Renamed by client";
    const save = await anon.rpc("save_shared_funnel", { p_token: ins.data!.token, p_graph: data.funnel.graph, p_settings: data.funnel.settings });
    expect(save.error).toBeNull();
    const after = await admin.from("funnels").select("graph").eq("id", TRIPWIRE).single();
    const n = (after.data!.graph as { nodes: Record<string, unknown>[] }).nodes[2];
    expect(n.name).toBe("Renamed by client");
    expect(n.desc).toBe("INTERNAL: client is price sensitive");
    expect(n.shot).toBe("screens/x.png");
  });
  it("hidden-number links strip prices and settings even when the RPC is called directly, and can't edit", async () => {
    const ins = await admin.from("share_links").insert({ funnel_id: WEBINAR, hide_numbers: true, can_edit: true }).select("token").single();
    expect(ins.error).toBeNull();
    const { data } = await anon.rpc("get_shared_funnel", { p_token: ins.data!.token });
    expect(data.link.hide_numbers).toBe(true);
    expect(data.link.can_edit).toBe(false);
    const blocks = data.funnel.graph.nodes.filter((n: { type: string }) => !["note", "label", "frame"].includes(n.type));
    expect(blocks.length).toBeGreaterThan(0);
    blocks.forEach((n: { p: object }) => expect(n.p).toEqual({}));
    expect(JSON.stringify(data)).not.toContain("997");
    expect(data.funnel.settings).toEqual({ currency: "GBP", basis: "first", hideNumbers: true });
    const save = await anon.rpc("save_shared_funnel", { p_token: ins.data!.token, p_graph: data.funnel.graph, p_settings: {} });
    expect(save.error).not.toBeNull();
  });
  it("a share link exposes only its own funnel and no client contact details", async () => {
    const { data } = await anon.rpc("get_shared_funnel", { p_token: "demo-share-token" });
    expect(data.funnel.id).toBe(TRIPWIRE);
    expect(Object.keys(data.client).sort()).toEqual(["business_name", "logo_url", "name"]);
    expect(JSON.stringify(data)).not.toContain("sam@carterstrength");
  });
  it("unknown token returns null", async () => {
    const { data } = await anon.rpc("get_shared_funnel", { p_token: "nope" });
    expect(data).toBeNull();
  });
  it("anonymous comment lands with the team", async () => {
    const { error } = await anon.rpc("add_share_comment", { p_token: "demo-share-token", p_node_id: "", p_author: "Client", p_body: "Love it" });
    expect(error).toBeNull();
    const { data } = await mate.from("share_comments").select("body").eq("body", "Love it");
    expect(data!.length).toBeGreaterThan(0);
  });
  it("read-only token cannot save", async () => {
    const { error } = await anon.rpc("save_shared_funnel", { p_token: "demo-share-token", p_graph: { nodes: [], edges: [] }, p_settings: {} });
    expect(error).not.toBeNull();
  });
  it("expired token is rejected", async () => {
    const ins = await admin.from("share_links").insert({ funnel_id: TRIPWIRE, expires_at: new Date(Date.now() - 1000).toISOString() }).select("token").single();
    expect(ins.error).toBeNull();
    const { data } = await anon.rpc("get_shared_funnel", { p_token: ins.data!.token });
    expect(data).toBeNull();
  });
});
