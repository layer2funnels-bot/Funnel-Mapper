import { expect, test, type Page } from "@playwright/test";
import { blankGraph } from "../../lib/graph";
import { centre, createFunnel, drag, node, nodes, openEditor, paletteItem } from "./helpers";

// Quick Add adapts to where it opens and to the screen: a popover that flips and clamps on desktop / tablet, a bottom sheet on a phone.

const SIZES = [
  [1536, 900],
  [1440, 900],
  [1280, 800],
  [1024, 768],
  [768, 1024],
  [430, 932],
  [414, 896],
  [390, 844],
] as const;

async function geometry(page: Page) {
  const stage = (await page.locator(".fm-stage").boundingBox())!;
  const box = (await page.getByRole("dialog", { name: "Add a block" }).boundingBox())!;
  const list = (await page.getByRole("listbox", { name: "Blocks" }).boundingBox())!;
  return { stage, box, list, vw: page.viewportSize()!.width, vh: page.viewportSize()!.height };
}

test.describe("Quick Add adapts to the screen", () => {
  for (const [w, h] of SIZES) {
    test(`${w}x${h}: opens fully on screen from the centre, every edge and every corner, with a usable list`, async ({ page }) => {
      const { id } = await createFunnel({ graph: blankGraph() });
      await page.setViewportSize({ width: w, height: h });
      await openEditor(page, id);
      const phone = w < 768;
      const stage = (await page.locator(".fm-stage").boundingBox())!;
      const m = 14;
      const spots: [string, number, number][] = [
        ["centre", stage.width / 2, stage.height / 2],
        ["left edge", m, stage.height / 2],
        ["right edge", stage.width - m, stage.height / 2],
        // (kept clear of the corner controls: the Clean / Layers bar, the legend, the minimap and the zoom bar)
        ["top edge", stage.width / 2, 150],
        ["bottom edge", stage.width / 2, stage.height - 90],
        ["top-left", m, 150],
        ["top-right", stage.width - m, 150],
        ["bottom-left", m, stage.height - 200],
        ["bottom-right", stage.width - m, stage.height - 100],
      ];
      for (const [name, x, y] of spots) {
        await page.locator(".react-flow__pane").dblclick({ position: { x, y }, force: true });
        const quick = page.getByRole("dialog", { name: "Add a block" });
        await expect(quick, name).toBeVisible();
        await page.waitForTimeout(350); // the sheet slides in
        const g = await geometry(page);
        if (phone) {
          // a sheet along the bottom: full width, never taller than the screen, list scrolls
          expect(g.box.x, `${name} sheet left`).toBeGreaterThanOrEqual(-1);
          expect(g.box.x + g.box.width, `${name} sheet right`).toBeLessThanOrEqual(g.vw + 1);
          expect(g.box.y + g.box.height, `${name} sheet bottom`).toBeLessThanOrEqual(g.vh + 1);
          expect(g.box.height, `${name} sheet height`).toBeLessThanOrEqual(g.vh * 0.7);
          expect(g.box.width).toBeGreaterThanOrEqual(g.vw - 2);
        } else {
          // a popover inside the canvas, whatever the opening point
          expect(g.box.x, `${name} left`).toBeGreaterThanOrEqual(g.stage.x - 1);
          expect(g.box.y, `${name} top`).toBeGreaterThanOrEqual(g.stage.y - 1);
          expect(g.box.x + g.box.width, `${name} right`).toBeLessThanOrEqual(g.stage.x + g.stage.width + 1);
          expect(g.box.y + g.box.height, `${name} bottom`).toBeLessThanOrEqual(g.stage.y + g.stage.height + 1);
          expect(g.box.width, `${name} width`).toBeGreaterThanOrEqual(Math.min(300, g.stage.width - 16));
        }
        expect(g.list.height, `${name} list height`).toBeGreaterThanOrEqual(90);
        await expect(quick.getByRole("combobox")).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(quick).toBeHidden();
      }
      // no horizontal page scroll
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    });
  }

  test("search, categories (also by keyboard), Pinned, Recent and client products all work, and Enter places the block", async ({ page }) => {
    const { id } = await createFunnel({ graph: blankGraph() });
    await openEditor(page, id);
    // Recent: place one block, then it leads the list next time
    await page.locator(".react-flow__pane").dblclick({ position: { x: 500, y: 300 } });
    let quick = page.getByRole("dialog", { name: "Add a block" });
    await quick.getByRole("combobox").fill("Facebook ads");
    await page.keyboard.press("Enter");
    await expect(nodes(page)).toHaveCount(1);
    await page.locator(".react-flow__pane").dblclick({ position: { x: 700, y: 500 } });
    quick = page.getByRole("dialog", { name: "Add a block" });
    await expect(quick.getByText("Recent")).toBeVisible();
    // the categories are reachable with Tab, and focus moving inside the box does not close it
    await page.keyboard.press("Tab");
    await expect(quick.getByRole("button", { name: "All", exact: true })).toBeFocused();
    await expect(quick).toBeVisible();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter"); // first category chip
    await expect(quick.getByRole("button", { pressed: true }).first()).toBeVisible();
    await expect(quick.getByRole("option").first()).toBeVisible();
    // arrow keys move the highlight; End/Home on an empty search jump
    await quick.getByRole("combobox").focus();
    await page.keyboard.press("End");
    await expect(quick.getByRole("option").last()).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Home");
    await expect(quick.getByRole("option").first()).toHaveAttribute("aria-selected", "true");
    // tabbing out of the box closes it
    await page.keyboard.press("Escape");
    await expect(quick).toBeHidden();
    await expect(nodes(page)).toHaveCount(1);
    // clicking the canvas closes it too
    await page.locator(".react-flow__pane").dblclick({ position: { x: 600, y: 400 } });
    await expect(page.getByRole("dialog", { name: "Add a block" })).toBeVisible();
    await page.locator(".react-flow__pane").click({ position: { x: 120, y: 160 } });
    await expect(page.getByRole("dialog", { name: "Add a block" })).toBeHidden();
  });

  test("dragging a connection out near the right and bottom edges keeps Quick Add on screen, at several zoom levels", async ({ page }) => {
    const { id } = await createFunnel({ graph: blankGraph() });
    await openEditor(page, id);
    await (await paletteItem(page, "Facebook Ads")).dragTo(page.locator(".react-flow__pane"), { targetPosition: { x: 130, y: 220 } });
    const fb = node(page, "Facebook Ads");
    for (const zoomOut of [0, 1, 3]) {
      await page.getByRole("button", { name: "Fit" }).first().click();
      await page.waitForTimeout(450); // the fit animates
      for (let k = 0; k < zoomOut; k++) await page.getByRole("button", { name: "Zoom out" }).click();
      await page.waitForTimeout(350);
      const stage = (await page.locator(".fm-stage").boundingBox())!;
      // (released on empty canvas, clear of the minimap, the zoom bar and the legend; a release near the edge also auto-pans the canvas, so the port is measured before every drag)
      const right = stage.x + stage.width - 20,
        bottom = stage.y + stage.height - 100;
      const clampY = (y: number) => Math.max(stage.y + 110, Math.min(bottom, y));
      for (const to of [
        { x: right, y: clampY(stage.y + stage.height / 2) },
        { x: stage.x + stage.width / 2 + 120, y: bottom },
        { x: right, y: bottom },
      ]) {
        await drag(page, await centre(page, fb.locator(".fm-port.side.right")), to);
        const quick = page.getByRole("dialog", { name: "Add the next step" });
        await expect(quick, `zoom-out ${zoomOut}, release ${to.x},${to.y}`).toBeVisible();
        const b = (await quick.boundingBox())!;
        expect(b.x).toBeGreaterThanOrEqual(stage.x - 1);
        expect(b.y).toBeGreaterThanOrEqual(stage.y - 1);
        expect(b.x + b.width).toBeLessThanOrEqual(stage.x + stage.width + 1);
        expect(b.y + b.height).toBeLessThanOrEqual(stage.y + stage.height + 1);
        await page.keyboard.press("Escape");
        await expect(quick).toBeHidden();
      }
    }
    await expect(nodes(page)).toHaveCount(1);
  });

  test("on a phone, dragging a connection into empty space opens the sheet, keeps the line's end in view, and placing a block connects it", async ({ page }) => {
    const { id } = await createFunnel({ graph: blankGraph() });
    await page.setViewportSize({ width: 390, height: 844 });
    await openEditor(page, id);
    await page.getByRole("button", { name: "Show building blocks" }).click();
    await (await paletteItem(page, "Facebook Ads")).click();
    const fb = node(page, "Facebook Ads");
    await expect(fb).toBeVisible();
    await page.getByRole("button", { name: "Close details" }).click(); // the new block opened its details sheet
    const from = await centre(page, fb.locator(".fm-port.side.right"));
    const stage = (await page.locator(".fm-stage").boundingBox())!;
    await drag(page, from, { x: Math.min(stage.x + stage.width - 40, from.x + 120), y: stage.y + stage.height - 90 });
    const quick = page.getByRole("dialog", { name: "Add the next step" });
    await expect(quick).toBeVisible();
    const q = (await quick.boundingBox())!;
    await page.waitForTimeout(350); // the sheet slides in
    const q2 = (await quick.boundingBox())!;
    expect(q2.y + q2.height).toBeLessThanOrEqual(844 + 1);
    expect(q.width).toBeGreaterThanOrEqual(388);
    // 44px+ touch rows
    const row = (await quick.getByRole("option").first().boundingBox())!;
    expect(row.height).toBeGreaterThanOrEqual(44);
    // the canvas was panned so the end of the line is above the sheet
    await expect.poll(async () => (await centre(page, fb.locator(".fm-port.side.right"))).y).toBeLessThan(q2.y);
    expect((await centre(page, fb.locator(".fm-port.side.right"))).y).toBeGreaterThan(stage.y); // and the block it came from is still on screen
    await quick.getByRole("combobox").fill("Landing");
    await quick.getByRole("option", { name: /Landing page/ }).first().click();
    await expect(nodes(page)).toHaveCount(2);
    await expect(page.locator(".fm-elabel")).toHaveCount(1);
    await expect(quick).toBeHidden();
  });
});
