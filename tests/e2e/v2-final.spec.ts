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
