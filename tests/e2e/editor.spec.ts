import { expect, test } from "@playwright/test";
import { money } from "../../lib/format";
import { compute } from "../../lib/funnel-math";
import { blankSettings } from "../../lib/graph";
import { tidyLayout } from "../../lib/layout";
import { centre, createFunnel, drag, edgeLabels, node, nodes, openEditor, pos, waitSaved } from "./helpers";

const mod = process.platform === "darwin" ? "Meta" : "Control";

test.describe("funnel editor", () => {
  test("renders a template with the prototype's numbers", async ({ page }) => {
    const { id } = await createFunnel({ template: "tripwire" });
    await openEditor(page, id);
    await expect(nodes(page)).toHaveCount(11);
    await expect(edgeLabels(page)).toHaveCount(7);
    // KPI bar: tripwire revenue £7,485 / profit £6,825 (same as the prototype)
    await expect(page.locator(".fm-kpis")).toContainText("£7,485");
    await expect(page.locator(".fm-kpis")).toContainText("£6,825");
    await expect(node(page, "Fitness quiz")).toContainText("1,035");
  });

  test("drag a block from the palette, and tap to add", async ({ page }) => {
    const { id } = await createFunnel();
    await openEditor(page, id);
    await expect(page.locator(".fm-empty")).toBeVisible();
    const stage = await centre(page, ".fm-stage");
    await page.getByRole("button", { name: "Add Landing page", exact: true }).dragTo(page.locator(".react-flow__pane"), { targetPosition: { x: 300, y: 250 } });
    await expect(nodes(page)).toHaveCount(1);
    await expect(page.locator(".fm-insp h3")).toHaveText("Landing page");
    await expect(page.locator(".fm-empty")).toBeHidden();
    // dropped where the mouse was (± snapping), not at the centre
    const box = (await nodes(page).first().boundingBox())!;
    expect(box.x).toBeLessThan(stage.x);
    await page.getByRole("button", { name: "Add Facebook ads", exact: true }).click();
    await expect(nodes(page)).toHaveCount(2);
    await expect(page.locator(".fm-insp h3")).toHaveText("Facebook ads");
  });

  test("connect ports: right = converted, bottom = didn't convert", async ({ page }) => {
    const { id } = await createFunnel();
    await openEditor(page, id);
    await page.getByRole("button", { name: "Add Facebook ads", exact: true }).dragTo(page.locator(".react-flow__pane"), { targetPosition: { x: 130, y: 200 } });
    await page.getByRole("button", { name: "Add Landing page", exact: true }).dragTo(page.locator(".react-flow__pane"), { targetPosition: { x: 400, y: 200 } });
    await page.getByRole("button", { name: "Add Thank-you page", exact: true }).dragTo(page.locator(".react-flow__pane"), { targetPosition: { x: 680, y: 110 } });
    await page.getByRole("button", { name: "Add Email sequence", exact: true }).dragTo(page.locator(".react-flow__pane"), { targetPosition: { x: 680, y: 430 } });
    await expect(nodes(page)).toHaveCount(4);
    const fb = node(page, "Facebook ads"),
      lp = node(page, "Landing page"),
      ty = node(page, "Thank-you page"),
      seq = node(page, "Email sequence");
    await drag(page, await centre(page, fb.locator(".fm-port.out")), await centre(page, lp));
    await expect(edgeLabels(page)).toHaveCount(1);
    await expect(edgeLabels(page).first()).toContainText("1,000");
    await drag(page, await centre(page, lp.locator(".fm-port.out")), await centre(page, ty));
    await drag(page, await centre(page, lp.locator(".fm-port.alt")), await centre(page, seq));
    await expect(edgeLabels(page)).toHaveCount(3);
    // landing converts 30%: 300 go right, 700 go down (labelled No)
    await expect(page.locator(".fm-elabel", { hasText: "300" })).toBeVisible();
    await expect(page.locator(".fm-elabel", { hasText: "No" })).toContainText("700");
    // can't connect into a traffic source or to the same target twice
    await drag(page, await centre(page, lp.locator(".fm-port.out")), await centre(page, fb));
    await drag(page, await centre(page, lp.locator(".fm-port.out")), await centre(page, ty));
    await expect(edgeLabels(page)).toHaveCount(3);
  });

  test("edit an edge: share and path", async ({ page }) => {
    const { id } = await createFunnel({ template: "webinar" });
    await openEditor(page, id);
    // registration → thank-you page carries the 720 people who registered (2,400 × 30%)
    await page.locator(".fm-elabel", { hasText: "720" }).first().click();
    await expect(page.locator(".fm-insp h3")).toHaveText("Connection");
    await page.getByLabel("Share of them (%)").fill("50");
    await expect(page.locator(".fm-elabel", { hasText: "· 50%" })).toContainText("360");
    await page.getByRole("button", { name: "People who didn’t convert" }).click();
    // now half of the 1,680 who didn't register
    await expect(page.locator(".fm-elabel", { hasText: "· 50%" })).toContainText("840");
    await expect(page.locator(".fm-elabel", { hasText: "· 50%" })).toContainText("No");
    await page.getByRole("button", { name: "Delete connection" }).click();
    await expect(edgeLabels(page)).toHaveCount(8);
    // traffic sources have no "didn't convert" path, so the option isn't offered
    await page.locator(".fm-elabel", { hasText: "2,400" }).first().click();
    await expect(page.getByRole("button", { name: "People who didn’t convert" })).toHaveCount(0);
  });

  test("box select with shift-drag, then group actions", async ({ page }) => {
    const { id } = await createFunnel({ template: "call" });
    await openEditor(page, id);
    const a = (await node(page, "LinkedIn ads").boundingBox())!;
    const b = (await node(page, "Application").boundingBox())!;
    await drag(page, { x: a.x - 20, y: a.y - 30 }, { x: b.x + b.width + 10, y: b.y + b.height + 20 }, { shift: true });
    await expect(page.locator(".fm-insp h3")).toHaveText("3 blocks");
    await page.getByRole("button", { name: "Put in a stage frame" }).click();
    await expect(page.locator(".fm-frame")).toHaveCount(1);
  });

  test("copy / paste, duplicate, delete, select all and undo / redo", async ({ page }) => {
    const { id } = await createFunnel({ template: "sub" });
    await openEditor(page, id);
    await expect(nodes(page)).toHaveCount(6);
    await node(page, "TikTok ads").click();
    await page.keyboard.press(`${mod}+c`);
    await expect(page.locator(".fm-toast")).toHaveText("Copied");
    await page.keyboard.press(`${mod}+v`);
    await expect(nodes(page)).toHaveCount(7);
    await page.keyboard.press(`${mod}+d`);
    await expect(nodes(page)).toHaveCount(8);
    await page.keyboard.press("Delete");
    await expect(nodes(page)).toHaveCount(7);
    // undo / redo with the keyboard and the toolbar
    await page.keyboard.press(`${mod}+z`);
    await expect(nodes(page)).toHaveCount(8);
    await page.keyboard.press(`${mod}+Shift+z`);
    await expect(nodes(page)).toHaveCount(7);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(nodes(page)).toHaveCount(8);
    await page.getByRole("button", { name: "Redo" }).click();
    await expect(nodes(page)).toHaveCount(7);
    await page.locator(".react-flow__pane").click({ position: { x: 420, y: 20 } });
    await page.keyboard.press(`${mod}+a`);
    await expect(page.locator(".fm-insp h3")).toHaveText("7 blocks");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tab", { name: "Overview" })).toBeVisible();
  });

  test("dragging a frame carries the blocks inside it", async ({ page }) => {
    const { id, graph } = await createFunnel({ template: "tripwire" });
    await openEditor(page, id);
    const ig = graph.nodes.find((n) => n.name === "Instagram ads")!;
    const before = await pos(page, ig.id);
    const title = page.locator(".fm-frame .ftitle", { hasText: "Get attention" });
    const t = await centre(page, title);
    await drag(page, t, { x: t.x + 120, y: t.y + 60 });
    const after = await pos(page, ig.id);
    expect(after.x - before.x).toBeGreaterThan(100);
    expect(after.y - before.y).toBeGreaterThan(40);
    // blocks outside the frame stay put
    const quiz = graph.nodes.find((n) => n.name === "Fitness quiz")!;
    expect(await pos(page, quiz.id)).toEqual({ x: quiz.x, y: quiz.y });
  });

  test("Tidy up gives the prototype's layout, and undoes in one step", async ({ page }) => {
    const { id, graph } = await createFunnel({ template: "quiz" });
    await openEditor(page, id);
    const first = graph.nodes[0];
    await page.getByRole("button", { name: "Tidy up" }).click();
    await expect(page.locator(".fm-toast")).toContainText("Layout tidied");
    // the app's canonical footprint (200 x 76, page and offer 114): the same layout the unit tests pin, centre-aligned rows
    const laid = tidyLayout(graph.nodes, graph.edges);
    for (const [i, n] of graph.nodes.entries()) expect(await pos(page, n.id), n.name).toEqual({ x: laid[i].x, y: laid[i].y });
    await page.keyboard.press(`${mod}+z`);
    await expect.poll(() => pos(page, first.id)).toEqual({ x: first.x, y: first.y });
    // keyboard shortcut + ELK alternative
    await page.keyboard.press(`${mod}+Shift+l`);
    await expect.poll(() => pos(page, first.id)).toEqual({ x: laid[0].x, y: laid[0].y });
    await page.getByRole("button", { name: "View", exact: true }).click();
    await page.getByRole("menuitem", { name: "Tidy up (ELK layered)" }).click();
    await expect(page.locator(".fm-toast")).toContainText("ELK");
  });

  test("Tidy up keeps notes and headings where they were placed, clear of the blocks", async ({ page }) => {
    const { id, graph } = await createFunnel({ template: "tripwire" });
    await openEditor(page, id);
    const note = graph.nodes.find((n) => n.type === "note")!;
    const coaching = graph.nodes.find((n) => n.name === "Monthly coaching")!; // the block the note sits under
    const before = { dx: note.x - coaching.x, dy: note.y - coaching.y };
    await page.getByRole("button", { name: "Tidy up" }).click();
    await expect(page.locator(".fm-toast")).toContainText("Layout tidied");
    const n = await pos(page, note.id),
      c = await pos(page, coaching.id);
    expect(n.x - c.x, "same horizontal offset").toBe(before.dx);
    expect(n.y - c.y, "still below that block, not re-anchored").toBeGreaterThanOrEqual(before.dy);
    // on screen, the note overlaps no funnel block (frames are containers and may enclose it).
    // Every box is read in the same frame: "fit to screen" is still zooming, and boxes read one by one would mix zoom levels.
    const blocks = graph.nodes.filter((x) => !["note", "label", "frame"].includes(x.type));
    const boxes = await page.evaluate((ids) => ids.map((i) => document.querySelector(`.react-flow__node[data-id="${i}"]`)!.getBoundingClientRect().toJSON() as DOMRect), [note.id, ...blocks.map((b) => b.id)]);
    const [box, ...rest] = boxes;
    rest.forEach((r, i) => {
      const hit = box.x < r.x + r.width && box.x + box.width > r.x && box.y < r.y + r.height && box.y + box.height > r.y;
      expect(hit, `note overlaps ${blocks[i].name}`).toBe(false);
    });
  });

  test("keyboard: nudge, help, shortcuts don't fire while typing", async ({ page }) => {
    const { id, graph } = await createFunnel({ template: "webinar" });
    await openEditor(page, id);
    const op = graph.nodes.find((n) => n.name === "Webinar registration")!;
    await node(page, "Webinar registration").click();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Shift+ArrowDown");
    await expect.poll(() => pos(page, op.id)).toEqual({ x: op.x + 11, y: op.y + 33 });
    // typing in the inspector must not delete the block
    const name = page.getByLabel("Name", { exact: true });
    await name.fill("Registration page");
    await name.press("Backspace");
    await expect(node(page, "Registration pag")).toHaveCount(1);
    await page.locator(".react-flow__pane").click({ position: { x: 10, y: 10 } });
    await page.keyboard.press("?");
    await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("inspector edits update maths live and autosave", async ({ page }) => {
    const { id, graph } = await createFunnel({ template: "webinar" });
    await openEditor(page, id);
    await node(page, "Program checkout").click();
    await page.getByLabel("Price (£)").fill("1997");
    const ck = graph.nodes.find((n) => n.name === "Program checkout")!;
    const expected = money(compute({ nodes: graph.nodes.map((n) => (n.id === ck.id ? { ...n, p: { ...n.p, price: 1997 } } : n)), edges: graph.edges }, blankSettings()).rev, "GBP");
    await expect(page.locator(".fm-kpis")).toContainText(expected);
    await waitSaved(page);
    await page.reload();
    await expect(page.locator(".fm-kpis")).toContainText(expected);
  });

  test("dark mode", async ({ page }) => {
    const { id } = await createFunnel({ template: "tripwire" });
    await openEditor(page, id);
    await page.getByRole("button", { name: "View", exact: true }).click();
    await page.getByRole("menuitem", { name: "Switch light / dark" }).click();
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(["dark", "light"]).toContain(theme);
    if (theme !== "dark") {
      await page.getByRole("button", { name: "View", exact: true }).click();
      await page.getByRole("menuitem", { name: "Switch light / dark" }).click();
    }
    // locked Emerald dark tokens: panels #1E293B, workspace chrome / blocks #111827
    const bg = await page.locator(".fm-insp").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe("rgb(30, 41, 59)");
    const nodeBg = await page.locator(".fm-node").first().evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(nodeBg).toBe("rgb(17, 24, 39)");
    await page.screenshot({ path: "test-results/editor-dark.png" });
    // persists across reloads
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
    await page.evaluate(() => localStorage.removeItem("fm-theme"));
  });
});

test.describe("tablet and phone", () => {
  test("tablet: palette and inspector become drawers", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: "tests/e2e/.auth/demo.json", viewport: { width: 820, height: 1180 }, hasTouch: true });
    const page = await ctx.newPage();
    const { id } = await createFunnel({ template: "webinar" });
    await openEditor(page, id);
    await expect(page.locator(".fm-side")).not.toBeInViewport();
    await page.getByRole("button", { name: "Show building blocks" }).click();
    await expect(page.locator(".fm-side")).toBeInViewport();
    await page.getByRole("button", { name: "Add Landing page", exact: true }).click();
    await expect(page.locator(".fm-side")).not.toBeInViewport();
    await expect(nodes(page)).toHaveCount(10);
    // selecting opens the inspector sheet
    await expect(page.locator(".fm-insp")).toBeInViewport({ ratio: 0.5 });
    await page.getByRole("button", { name: "Close details" }).click();
    await expect(page.locator(".fm-insp")).not.toBeInViewport();
    await page.getByRole("button", { name: "Show numbers and details" }).click();
    await expect(page.locator(".fm-insp")).toBeInViewport({ ratio: 0.5 });
    await page.screenshot({ path: "test-results/editor-tablet.png" });
    await ctx.close();
  });

  test("phone: opens view-only, can switch to editing", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: "tests/e2e/.auth/demo.json", viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    const { id } = await createFunnel({ template: "tripwire" });
    await page.goto(`/funnels/${id}`);
    await expect(nodes(page)).toHaveCount(11);
    await expect(page.getByRole("button", { name: "Show building blocks" })).toHaveCount(0);
    await expect(page.locator(".fm-kpis")).toBeVisible();
    await page.screenshot({ path: "test-results/editor-phone.png" });
    await page.getByRole("button", { name: "View", exact: true }).click();
    await page.getByText("View only (lock editing)").click();
    await expect(page.getByRole("button", { name: "Show building blocks" })).toBeVisible();
    await ctx.close();
  });
});
