import { expect, test, type Browser, type Page } from "@playwright/test";
import { builtinTemplate } from "../../lib/templates";
import { createFunnel, node, openEditor } from "./helpers";

// Layout decisions for tablets and phones (and the KPI strip on desktop), pinned as behaviour: where a control lives,
// what stacks, what hides. No-sideways-scroll and 40px touch targets are covered in no-page-scroll / touch-targets.
async function open(browser: Browser, width: number, height: number, touch = true) {
  const ctx = await browser.newContext({ storageState: "tests/e2e/.auth/demo.json", viewport: { width, height }, hasTouch: touch, isMobile: touch && width < 768 });
  return { ctx, page: await ctx.newPage() };
}

const display = (page: Page, sel: string) => page.locator(sel).first().evaluate((el) => getComputedStyle(el).display);

test.describe("phone (390px)", () => {
  test("Clients keeps search on one row and puts the extra filters behind a button", async ({ browser }) => {
    const { ctx, page } = await open(browser, 390, 844);
    await page.goto("/clients");
    await expect(page.getByPlaceholder(/Search name/)).toBeVisible();
    const filters = page.getByRole("button", { name: "Filters", exact: true });
    await expect(filters).toBeVisible();
    await expect(filters).toHaveAttribute("aria-expanded", "false");
    await filters.click();
    await expect(filters).toHaveAttribute("aria-expanded", "true");
    await ctx.close();
  });

  test("Home's Recent funnels stacks each row as labelled lines instead of scrolling sideways", async ({ browser }) => {
    const { ctx, page } = await open(browser, 390, 844);
    await page.goto("/");
    await expect(page.locator(".fm-stackrows").first()).toBeVisible();
    expect(await display(page, ".fm-stackrows tbody tr")).toBe("grid");
    expect(await display(page, ".fm-stackrows thead")).toBe("none");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await ctx.close();
  });

  test("Funnels keeps a compact table of name, revenue and checks that fits the screen", async ({ browser }) => {
    const { ctx, page } = await open(browser, 390, 844);
    await page.goto("/funnels");
    const table = page.locator(".fm-funnels");
    await expect(table).toBeVisible();
    for (const h of ["Funnel", "Revenue / mo", "Checks"]) await expect(table.getByRole("columnheader", { name: h })).toBeVisible();
    const box = await table.boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    await ctx.close();
  });

  test("Templates opens with a search box and the preview stays closed until a card is chosen", async ({ browser }) => {
    const { ctx, page } = await open(browser, 390, 844);
    await page.goto("/templates");
    await expect(page.getByPlaceholder(/Search \d+ templates/)).toBeVisible();
    await expect(page.locator(".fm-tplpanel")).toBeHidden();
    await ctx.close();
  });

  test("editor: Reports sits in the header, the library opens as a bottom sheet", async ({ browser }) => {
    const { id } = await createFunnel({ graph: builtinTemplate("quiz").graph });
    const { ctx, page } = await open(browser, 390, 844);
    await openEditor(page, id);
    await expect(page.getByRole("button", { name: "Reports" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Map", exact: true })).toBeHidden(); // you are on the map: only the other view is offered
    await page.getByRole("button", { name: /Add a block|Show building blocks/ }).first().click();
    const sheet = await page.locator(".fm-side").boundingBox();
    expect(sheet, "library sheet is visible").not.toBeNull();
    expect(sheet!.y + sheet!.height).toBeGreaterThan(844 - 4); // anchored to the bottom edge
    expect(sheet!.height).toBeGreaterThan(300);
    expect(sheet!.height).toBeLessThan(844 * 0.8); // the map stays visible above it
    await ctx.close();
  });

  test("editor: a wide funnel opens at a readable zoom from its first block, and the block sheet header is compact", async ({ browser }) => {
    const { id } = await createFunnel({ graph: builtinTemplate("quiz").graph });
    const { ctx, page } = await open(browser, 390, 844);
    await openEditor(page, id);
    await expect(page.locator(".react-flow__node").first()).toBeVisible();
    const k = await page.locator(".react-flow__viewport").evaluate((el) => Number(/scale\(([\d.]+)\)/.exec((el as HTMLElement).style.transform)?.[1] ?? 0));
    expect(k, "zoom on first open").toBeGreaterThanOrEqual(0.49); // names are readable; Fit still shows the whole funnel
    await node(page, "Quiz funnel").click();
    await expect(page.locator(".fm-insp .fm-scopehead")).toBeVisible();
    const head = await page.locator(".fm-insp .fm-scopehead").boundingBox();
    expect(head!.height).toBeLessThanOrEqual(112);
    await ctx.close();
  });

  test("editor: the numbers strip scrolls and starts with Traffic", async ({ browser }) => {
    const { id } = await createFunnel({ graph: builtinTemplate("quiz").graph });
    const { ctx, page } = await open(browser, 390, 844);
    await openEditor(page, id);
    await expect(page.locator(".fm-kpis")).toContainText(/Traffic/);
    const first = await page.locator(".fm-kpis").getByText("Traffic", { exact: true }).first().boundingBox();
    expect(first!.x).toBeLessThan(120);
    await ctx.close();
  });
});

test.describe("tablet (768px and 1024px)", () => {
  test("Funnels list drops the map column below 1280 and keeps every row readable", async ({ browser }) => {
    const { ctx, page } = await open(browser, 1024, 768, false);
    await page.goto("/funnels");
    await expect(page.locator(".fm-funnels")).toBeVisible();
    expect(await display(page, ".fm-funnels .fm-c-map")).toBe("none");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await ctx.close();
  });

  test("Templates preview is a drawer below 1280", async ({ browser }) => {
    const { ctx, page } = await open(browser, 768, 1024);
    await page.goto("/templates");
    await expect(page.locator(".fm-tplpanel")).toBeHidden();
    await page.getByRole("button", { name: /^Preview / }).first().click();
    await expect(page.locator(".fm-tplpanel")).toBeVisible();
    await page.getByRole("button", { name: "Close preview" }).click();
    await expect(page.locator(".fm-tplpanel")).toBeHidden();
    await ctx.close();
  });

  test("editor header and numbers strip fit without clipping", async ({ browser }) => {
    const { id } = await createFunnel({ graph: builtinTemplate("quiz").graph });
    for (const [w, h] of [[768, 1024], [1024, 768]] as const) {
      const { ctx, page } = await open(browser, w, h);
      await openEditor(page, id);
      await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
      const clipped = await page.locator(".fm-kpis").evaluate((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === "hidden");
      expect(clipped, `${w}px strip clips its figures`).toBe(false);
      await ctx.close();
    }
  });
});

test.describe("desktop numbers strip", () => {
  for (const [w, h] of [[1280, 800], [1440, 900], [1536, 864]] as const) {
    test(`${w}px: the strip shows Traffic, Revenue and Profit whole, the rest behind "+N more"`, async ({ browser }) => {
      const { id } = await createFunnel({ graph: builtinTemplate("quiz").graph });
      const { ctx, page } = await open(browser, w, h, false);
      await openEditor(page, id);
      const kpis = page.locator(".fm-kpis");
      await expect(kpis).toContainText(/Traffic/);
      await expect(kpis).toContainText(/Revenue/);
      await expect(kpis).toContainText(/Profit/);
      // nothing drawn past the bar's own right edge
      const overflow = await kpis.evaluate((bar) => {
        const right = bar.getBoundingClientRect().right;
        return [...bar.querySelectorAll<HTMLElement>("*")].filter((e) => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().right > right + 1).length;
      });
      expect(overflow).toBe(0);
      await expect(kpis.getByRole("button", { name: /more/ })).toBeVisible();
      await ctx.close();
    });
  }

  test("a block can still be selected and the strip stays put", async ({ browser }) => {
    const { id } = await createFunnel({ graph: builtinTemplate("quiz").graph });
    const { ctx, page } = await open(browser, 1440, 900, false);
    await openEditor(page, id);
    await node(page, "Quiz funnel").click();
    await expect(page.locator(".fm-kpis")).toContainText(/Traffic/);
    await ctx.close();
  });
});
