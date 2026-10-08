// Funnel Mapper Pro V2 final features, through the real UI.
import { expect, test } from "@playwright/test";
import { centre, createFunnel, node, openEditor, waitSaved } from "./helpers";
import { blankGraph } from "../../lib/graph";

test.describe("four ports and line meanings", () => {
  test("ports are hidden at rest, a line can leave any side, and its meaning is chosen on the line", async ({ page }) => {
    const graph = {
      ...blankGraph(),
      nodes: [
        { id: "a", type: "landing", name: "Landing", x: 100, y: 300, p: { cr: 30, lead: false } },
        { id: "b", type: "thanks", name: "Thanks", x: 520, y: 80, p: { cr: 100, lead: false } },
      ],
      edges: [],
      view: { x: 40, y: 0, k: 1 },
    };
    const { id, sb } = await createFunnel({ graph });
    await openEditor(page, id);
    const a = node(page, "Landing");
    const top = a.locator(".fm-port.side.top");
    // calm map: ports are invisible until the block is hovered
    await page.mouse.move(5, 5);
    await expect(top).toHaveCSS("opacity", "0");
    await a.hover();
    await expect(top).toHaveCSS("opacity", "1");
    const from = await centre(page, top);
    const to = await centre(page, node(page, "Thanks"));
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x, from.y - 30, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 14 });
    await page.mouse.up();
    const menu = page.getByRole("radiogroup", { name: "Connect as" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("radio", { name: "Yes: people who continue" })).toHaveAttribute("aria-checked", "true");
    await menu.getByRole("radio", { name: "No: people who leave" }).click();
    await expect(menu).toBeHidden();
    await waitSaved(page);
    const { data } = await sb.from("funnels").select("graph").eq("id", id).single();
    const e = (data!.graph as { edges: { from: string; to: string; port: string; sh?: string }[] }).edges[0];
    expect(e).toMatchObject({ from: "a", to: "b", port: "alt", sh: "top" });
    // the meaning can be changed later on the selected line
    await page.locator(".fm-elabel").first().click();
    await page.getByRole("radiogroup", { name: "This line means" }).getByRole("radio", { name: "Skip step" }).click();
    await waitSaved(page);
    const { data: d2 } = await sb.from("funnels").select("graph").eq("id", id).single();
    expect((d2!.graph as { edges: { port: string; s?: { kind?: string } }[] }).edges[0]).toMatchObject({ port: "main", s: { kind: "skip" } });
  });
});

test.describe("trash", () => {
  test("a funnel moves to Trash with a plain question and comes back; a client asks for its name first", async ({ page }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const { env } = await import("./helpers");
    const sb = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), { auth: { persistSession: false } });
    await sb.auth.signInWithPassword({ email: "demo@layer2funnels.test", password: "demo-password" });
    const uid = (await sb.auth.getUser()).data.user!.id;
    const name = `Trash client ${Date.now()}`;
    const { data: c } = await sb.from("clients").insert({ name, owner_id: uid }).select("id").single();
    const fname = `Trash funnel ${Date.now()}`;
    await sb.from("funnels").insert({ client_id: c!.id, name: fname, graph: blankGraph(), settings: {} });

    await page.goto(`/clients/${c!.id}`);
    await page.getByRole("button", { name: `Move ${fname} to Trash` }).click();
    const dlg = page.getByRole("dialog", { name: "Move to Trash?" });
    await expect(dlg).toBeVisible();
    await dlg.getByRole("button", { name: "Move to Trash" }).click();
    await expect(page.getByRole("button", { name: `Move ${fname} to Trash` })).toHaveCount(0);

    await page.goto("/trash");
    const row = page.getByRole("row", { name: new RegExp(fname) });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: `Restore ${fname}` }).click();
    await expect(page.getByRole("status")).toContainText("restored");

    // the client: the button only turns on once its name is typed; its funnels go with it
    await page.goto(`/clients/${c!.id}?tab=details`);
    await page.getByRole("button", { name: "Move client to Trash" }).click();
    const cd = page.getByRole("dialog", { name: "Move this client to Trash?" });
    const go = cd.getByRole("button", { name: "Move to Trash" });
    await expect(go).toBeDisabled();
    await cd.getByLabel(`Type ${name} to confirm`).fill(name);
    await expect(go).toBeEnabled();
    await go.click();
    await expect(page).toHaveURL(/\/clients\?trashed=1/);
    await page.goto("/trash");
    await expect(page.getByRole("row", { name: new RegExp(name) })).toContainText("with 1 funnel");
    // delete forever asks once more and says it can't be undone
    await page.getByRole("button", { name: `Delete ${name} forever` }).click();
    const df = page.getByRole("dialog", { name: "Delete forever?" });
    await expect(df).toContainText("cannot be undone");
    await df.getByRole("button", { name: "Delete forever" }).click();
    await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(0);
  });
});
