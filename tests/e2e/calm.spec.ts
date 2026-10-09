import { expect, test, type Page } from "@playwright/test";
import { blankGraph, type FunnelEdge, type FunnelGraph, type FunnelNode } from "../../lib/graph";
import { defaultsFor } from "../../lib/catalog";
import { template13Graph } from "../../lib/templates13";
import { createFunnel, node, openEditor } from "./helpers";

// The calm editor (V3): Clean shows no numbers, People and Money show one per block and one per line, labels never sit on a block's
// name, and the quick settings box opens and closes from the keyboard.

/** A 20-block funnel in a snake: traffic, pages, an offer and logic, so the map is busy enough to expose label collisions. */
function bigGraph(): FunnelGraph {
  const g = blankGraph();
  const types = ["fbads", "gads", "landing", "optin", "quizp", "cond", "sales", "checkout", "upsell", "webinar", "replay", "vsl", "apply", "booking", "downsell", "membership", "survey", "challenge", "email", "smsb"];
  const nodes: FunnelNode[] = types.map((type, i) => ({ id: `b${i}`, type, name: `Step ${String.fromCharCode(65 + i)}`, x: 120 + (i % 5) * 260, y: 80 + Math.floor(i / 5) * 200, p: defaultsFor(type) }));
  const edges: FunnelEdge[] = types.slice(1).map((_, i) => ({ id: `e${i}`, from: `b${i}`, to: `b${i + 1}`, share: 100, port: "main" }));
  return { ...g, nodes, edges };
}

const NUM = /\d[\d,]*(?:\.\d+)?%?/g;

async function snapshot(page: Page) {
  return page.evaluate(() => {
    const out: { nodes: { id: string; title: string; text: string; box: DOMRect; titleBox: DOMRect | null }[]; labels: { text: string; box: DOMRect }[] } = { nodes: [], labels: [] };
    document.querySelectorAll<HTMLElement>(".react-flow__node").forEach((el) => {
      if (/react-flow__node-(frame|note|label|shape|image|checklist|widget)/.test(el.className)) return;
      const t = el.querySelector<HTMLElement>(".fm-ntitle span, .pgo-title");
      const clone = el.cloneNode(true) as HTMLElement;
      // the leak chip and its "−N" stub are the funnel's one leak label, counted with the lines
      clone.querySelectorAll(".fm-leak, .fm-leakstub, .fm-nstats.badges, .fm-ntasks, .react-flow__handle").forEach((x) => x.remove());
      clone.querySelectorAll(".fm-ntitle span, .pgo-title").forEach((x) => x.remove());
      out.nodes.push({ id: el.dataset.id ?? "", title: t?.textContent ?? "", text: clone.innerText, box: el.getBoundingClientRect(), titleBox: t?.getBoundingClientRect() ?? null });
    });
    document.querySelectorAll<HTMLElement>(".fm-elabel").forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") return;
      out.labels.push({ text: el.innerText, box: el.getBoundingClientRect() });
    });
    return out;
  });
}

const overlap = (a: { left: number; right: number; top: number; bottom: number }, b: { left: number; right: number; top: number; bottom: number }) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;

const MAPS: [string, () => FunnelGraph][] = [
  ["webinar template", () => template13Graph("v2-webinar")],
  ["product launch template", () => template13Graph("v2-product-launch")],
  ["20-block funnel", bigGraph],
];

for (const [label, make] of MAPS) {
  test.describe(`calm views: ${label}`, () => {
    test("Clean has no numbers, People and Money show one per block and one per line, no label sits on a block name", async ({ page }) => {
      test.setTimeout(120_000);
      const { id } = await createFunnel({ graph: make() });
      await openEditor(page, id);
      await expect(page.locator(".react-flow__node").first()).toBeVisible();
      // fit the whole map so every block and line is on screen
      await page.getByRole("button", { name: "Fit", exact: true }).click();
      await page.waitForTimeout(600);

      for (const view of ["Clean", "People", "Money"] as const) {
        await page.getByRole("button", { name: view, exact: true }).click();
        await page.waitForTimeout(500);
        const s = await snapshot(page);
        expect(s.nodes.length, `${view}: blocks on screen`).toBeGreaterThan(3);
        for (const n of s.nodes) {
          const tokens = n.text.match(NUM) ?? [];
          if (view === "Clean") expect(tokens, `Clean: ${n.title} shows ${n.text.replace(/\n/g, " | ")}`).toEqual([]);
          else expect(tokens.length, `${view}: ${n.title} shows ${n.text.replace(/\n/g, " | ")}`).toBeLessThanOrEqual(1);
        }
        for (const l of s.labels) {
          const tokens = l.text.match(NUM) ?? [];
          if (view === "Clean") expect(tokens, `Clean: line label "${l.text}"`).toEqual([]);
          else expect(tokens.length, `${view}: line label "${l.text}"`).toBeLessThanOrEqual(1);
        }
        // a label never covers a block's name
        for (const l of s.labels)
          for (const n of s.nodes) if (n.titleBox) expect(overlap(l.box, n.titleBox), `${view}: "${l.text}" covers "${n.title}"`).toBe(false);
      }
    });
  });
}

test("the details panel starts as a rail and the strip's numbers are not repeated in it", async ({ page }) => {
  const { id } = await createFunnel({ graph: template13Graph("v2-webinar") });
  await openEditor(page, id, { panel: false });
  await expect(page.locator(".fm-irail")).toBeVisible();
  await expect(page.locator(".fm-insp")).toBeHidden();
  // the strip leads with Traffic and is never hidden
  const strip = page.locator(".fm-kpis");
  await expect(strip).toContainText(/Traffic/);
  const revenue = (await strip.innerText()).match(/[£$€]\s?[\d,]+/)?.[0];
  await page.getByRole("button", { name: "Funnel", exact: true }).click();
  await expect(page.locator(".fm-insp")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Biggest leak/i }).or(page.getByText(/Biggest leak/i)).first()).toBeVisible();
  if (revenue) expect(await page.locator(".fm-insp").innerText()).not.toContain(revenue);
});

test("Enter opens the settings box on a selected block, Esc closes it and the block keeps focus", async ({ page }) => {
  const { id } = await createFunnel({ graph: template13Graph("v2-webinar") });
  await openEditor(page, id);
  const first = page.locator(".react-flow__node:not(.react-flow__node-frame):not(.react-flow__node-note)").nth(1);
  const nodeId = await first.getAttribute("data-id");
  await first.click();
  await page.keyboard.press("Enter");
  const box = page.getByRole("dialog", { name: /^Settings for / });
  await expect(box).toBeVisible();
  await expect(box.getByRole("tab", { name: "Settings" })).toBeVisible();
  expect(await box.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(box).toBeHidden();
  await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.closest(".react-flow__node")?.getAttribute("data-id") ?? "")).toBe(nodeId);
});

test("settings box: edits show on the map at once, Esc puts them back, Enter keeps them", async ({ page }) => {
  const { id } = await createFunnel({ template: "tripwire" });
  await openEditor(page, id);
  const quiz = page.locator(".react-flow__node").filter({ hasText: /Fitness quiz|Quiz funnel/ }).first();
  await quiz.dblclick();
  const box = page.getByRole("dialog", { name: /^Settings for / });
  await expect(box).toBeVisible();
  const field = box.getByRole("spinbutton", { name: /People who continue/ });
  const before = await field.inputValue();
  await field.fill("77");
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");
  await expect(box).toBeHidden();
  await quiz.dblclick();
  await expect(box.getByRole("spinbutton", { name: /People who continue/ })).toHaveValue(before);
  await box.getByRole("spinbutton", { name: /People who continue/ }).fill("77");
  await page.keyboard.press("Enter");
  await expect(box).toBeHidden();
  await quiz.dblclick();
  await expect(box.getByRole("spinbutton", { name: /People who continue/ })).toHaveValue("77");
});

test("Plan control: one control for the scenario and Actual; a scenario shows the editing banner and Baseline stays untouched", async ({ page }) => {
  const { id } = await createFunnel({ template: "tripwire" });
  await openEditor(page, id);
  const plan = page.getByRole("group", { name: /Plan or actual numbers/ });
  await expect(plan).toContainText("Baseline");
  await plan.getByRole("button", { name: /^Plan:/ }).click();
  await page.getByRole("button", { name: /New scenario from Baseline/ }).click();
  await expect(page.getByRole("status").filter({ hasText: /Baseline is untouched/ })).toBeVisible();
});

test("Actual: the banner offers Enter numbers and Import CSV when nothing is entered for the dates", async ({ page }) => {
  const { id } = await createFunnel({ template: "tripwire" });
  await openEditor(page, id);
  await page.getByRole("group", { name: /Plan or actual numbers/ }).getByRole("button", { name: "Actual", exact: true }).click();
  const banner = page.locator(".fm-banner-actual");
  await expect(banner).toContainText("No real numbers for these dates yet.");
  await banner.getByRole("button", { name: "Enter numbers" }).click();
  await expect(page.getByRole("dialog", { name: /Actuals/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await banner.getByRole("button", { name: "Import CSV" }).click();
  await expect(page.getByRole("tab", { name: "Import CSV", selected: true })).toBeVisible();
});

test("Actual: the block's Actual tab saves real numbers and shows the difference from Plan", async ({ page }) => {
  const { id } = await createFunnel({ template: "tripwire" });
  await openEditor(page, id);
  await page.getByRole("group", { name: /Plan or actual numbers/ }).getByRole("button", { name: "Actual", exact: true }).click();
  const quiz = page.locator(".react-flow__node").filter({ hasText: /Fitness quiz|Quiz funnel/ }).first();
  await quiz.dblclick();
  const box = page.getByRole("dialog", { name: /^Settings for / });
  await expect(box.getByRole("tab", { name: "Actual", selected: true })).toBeVisible();
  await box.getByRole("spinbutton", { name: "People in" }).fill("1000");
  await box.getByRole("spinbutton", { name: "People who moved on" }).fill("400");
  await expect(box).toContainText(/saved/, { timeout: 10_000 });
  await expect(box).toContainText(/pts/);
  await page.keyboard.press("Enter");
  await expect(page.locator(".fm-banner-actual")).toContainText(/1 step entered/);
});

test("Funnels list: select rows for the bulk bar, rename from the row menu, trash with a confirmation", async ({ page }) => {
  const name = `E2E list ${Date.now()}`;
  await createFunnel({ graph: blankGraph(), name });
  await page.goto("/funnels");
  const row = page.locator("tr", { hasText: name });
  await expect(row).toBeVisible();
  await row.getByRole("checkbox").check();
  await expect(page.getByRole("region", { name: "Selected funnels" })).toContainText("1 selected");
  await page.getByRole("button", { name: "Clear" }).click();
  await row.getByRole("button", { name: /^Actions for/ }).click();
  for (const item of ["Open map", "Open reports", "Rename", "Duplicate", "Move to client…", "Status", "Archive", "Move to Trash"]) await expect(page.getByRole("menuitem", { name: new RegExp(`^${item}`) })).toBeVisible();
  await page.getByRole("menuitem", { name: /^Rename/ }).click();
  const input = page.getByRole("textbox", { name: "Funnel name" });
  await input.fill(`${name} renamed`);
  await input.press("Enter");
  await expect(page.locator("tr", { hasText: `${name} renamed` })).toBeVisible();
  await page.reload();
  const renamed = page.locator("tr", { hasText: `${name} renamed` });
  await expect(renamed).toBeVisible();
  await renamed.getByRole("button", { name: /^Actions for/ }).click();
  await page.getByRole("menuitem", { name: "Move to Trash" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Move to Trash" }).click();
  await expect(page.locator("tr", { hasText: `${name} renamed` })).toHaveCount(0);
  void node;
});
