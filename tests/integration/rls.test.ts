// Row Level Security + share-link RPCs against the local Supabase stack.
// Requires `npx supabase start` and `npx supabase db reset` (seed). Run: npm run test:db
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const mk = () => createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

let demo: SupabaseClient, other: SupabaseClient, anon: SupabaseClient, otherId: string;

beforeAll(async () => {
  demo = mk();
  const a = await demo.auth.signInWithPassword({ email: "demo@layer2funnels.test", password: "demo-password" });
  expect(a.error).toBeNull();
  other = mk();
  const b = await other.auth.signInWithPassword({ email: "teammate@layer2funnels.test", password: "demo-password" });
  expect(b.error).toBeNull();
  otherId = b.data.user!.id;
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
});

describe("row level security", () => {
  it("owner sees their seeded portfolio", async () => {
    const { data } = await demo.from("clients").select("id");
    expect(data!.length).toBeGreaterThanOrEqual(4);
    const f = await demo.from("funnels").select("id");
    expect(f.data!.length).toBeGreaterThanOrEqual(5);
  });
  it("another user sees nothing of theirs", async () => {
    for (const t of ["clients", "funnels", "funnel_versions", "funnel_actuals", "share_links", "products", "share_comments"] as const) {
      const { data, error } = await other.from(t).select("id");
      expect(error, t).toBeNull();
      expect(data, t).toEqual([]);
    }
  });
  it("profile row exists for each team member and only their own is visible", async () => {
    const { data } = await other.from("profiles").select("id");
    expect(data!.map((r) => r.id)).toEqual([otherId]);
  });
  it("cannot attach a funnel to someone else's client", async () => {
    const { error } = await other.from("funnels").insert({ client_id: "10000000-0000-4000-8000-000000000001", name: "x" });
    expect(error).not.toBeNull();
  });
  it("cannot update or delete someone else's rows", async () => {
    const u = await other.from("clients").update({ name: "hacked" }).eq("id", "10000000-0000-4000-8000-000000000001").select();
    expect(u.data).toEqual([]);
    const d = await other.from("funnels").delete().eq("id", "20000000-0000-4000-8000-000000000001").select();
    expect(d.data).toEqual([]);
    const still = await demo.from("clients").select("name").eq("id", "10000000-0000-4000-8000-000000000001").single();
    expect(still.data!.name).toBe("Sam Carter");
  });
  it("built-in templates are visible to everyone signed in, but not writable", async () => {
    const { data } = await other.from("templates").select("builtin_key").not("builtin_key", "is", null);
    expect(data!.length).toBe(5);
    const u = await other.from("templates").update({ name: "x" }).not("builtin_key", "is", null).select();
    expect(u.data).toEqual([]);
  });
  it("anonymous users cannot read tables", async () => {
    const { data } = await anon.from("funnels").select("id");
    expect(data ?? []).toEqual([]);
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
  it("hidden-number links strip prices and settings even when the RPC is called directly", async () => {
    const ins = await demo.from("share_links").insert({ funnel_id: "20000000-0000-4000-8000-000000000003", hide_numbers: true }).select("token").single();
    expect(ins.error).toBeNull();
    const { data } = await anon.rpc("get_shared_funnel", { p_token: ins.data!.token });
    expect(data.link.hide_numbers).toBe(true);
    const blocks = data.funnel.graph.nodes.filter((n: { type: string }) => !["note", "label", "frame"].includes(n.type));
    expect(blocks.length).toBeGreaterThan(0);
    blocks.forEach((n: { p: object }) => expect(n.p).toEqual({}));
    expect(JSON.stringify(data)).not.toContain("997");
    expect(data.funnel.settings).toEqual({ currency: "GBP", basis: "first", hideNumbers: true });
  });
  it("a share link exposes only its own funnel and no client contact details", async () => {
    const { data } = await anon.rpc("get_shared_funnel", { p_token: "demo-share-token" });
    expect(data.funnel.id).toBe("20000000-0000-4000-8000-000000000001");
    expect(Object.keys(data.client).sort()).toEqual(["business_name", "logo_url", "name"]);
    expect(JSON.stringify(data)).not.toContain("sam@carterstrength");
  });
  it("unknown token returns null", async () => {
    const { data } = await anon.rpc("get_shared_funnel", { p_token: "nope" });
    expect(data).toBeNull();
  });
  it("anonymous comment lands with the funnel owner", async () => {
    const { error } = await anon.rpc("add_share_comment", { p_token: "demo-share-token", p_node_id: "", p_author: "Client", p_body: "Love it" });
    expect(error).toBeNull();
    const { data } = await demo.from("share_comments").select("body").eq("body", "Love it");
    expect(data!.length).toBeGreaterThan(0);
  });
  it("read-only token cannot save", async () => {
    const { error } = await anon.rpc("save_shared_funnel", { p_token: "demo-share-token", p_graph: { nodes: [], edges: [] }, p_settings: {} });
    expect(error).not.toBeNull();
  });
  it("expired token is rejected", async () => {
    const ins = await demo.from("share_links").insert({ funnel_id: "20000000-0000-4000-8000-000000000001", expires_at: new Date(Date.now() - 1000).toISOString() }).select("token").single();
    expect(ins.error).toBeNull();
    const { data } = await anon.rpc("get_shared_funnel", { p_token: ins.data!.token });
    expect(data).toBeNull();
  });
});
