import { expect, test, type Browser } from "@playwright/test";
import { createFunnel, latestMail, openEditor, signIn, waitSaved } from "./helpers";

const TRIPWIRE = "20000000-0000-4000-8000-000000000001"; // team funnel
const INDIE_FUNNEL = "20000000-0000-4000-8000-000000000101"; // solo@independent.test's funnel

/** Follow the invite link in the latest email to `email`, choose a password, and return the signed-in page. */
async function acceptInvite(browser: Browser, email: string, since: number) {
  const mail = await latestMail(email, since);
  const href = mail.HTML.match(/href="([^"]*\/auth\/confirm[^"]*)"/)![1].replace(/&amp;/g, "&");
  const url = new URL(href);
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  await page.goto(url.pathname + url.search);
  await expect(page).toHaveURL(/\/update-password/);
  await page.getByLabel("New password").fill("independent-pass-1");
  await page.getByLabel("Confirm password").fill("independent-pass-1");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page).toHaveURL("/");
  return { ctx, page, mail };
}

test.describe("workspaces", () => {
  test("an independent user sees only their own private workspace", async ({ browser }) => {
    const { ctx, page } = await signIn(browser, "solo@independent.test");
    await expect(page).toHaveURL("/");
    await expect(page.getByText("Solo Studio").first()).toBeVisible();
    await page.goto("/clients");
    await expect(page.getByRole("link", { name: /Indie Client/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sam Carter/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Second Indie Client/ })).toHaveCount(0);
    // a team funnel URL is simply not found
    const res = await page.goto(`/funnels/${TRIPWIRE}`);
    expect(res!.status()).toBe(404);
    // their own funnel opens in the editor
    await openEditor(page, INDIE_FUNNEL);
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Private workspace" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send invite" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Independent accounts" })).toHaveCount(0);
    await page.goto("/templates");
    await expect(page.getByRole("heading", { name: "Your templates" })).toBeVisible();
    await ctx.close();
  });

  test("the team can't see independent users' clients or funnels", async ({ page }) => {
    await page.goto("/clients");
    await expect(page.getByRole("link", { name: /Sam Carter/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Indie Client/ })).toHaveCount(0);
    const res = await page.goto(`/funnels/${INDIE_FUNNEL}`);
    expect(res!.status()).toBe(404);
  });

  test("a team admin creates an independent account; it gets its own empty workspace", async ({ page, browser }) => {
    test.setTimeout(120_000);
    const email = `indie.${Date.now()}@example.test`;
    const since = Date.now();
    await page.goto("/settings");
    const section = page.getByRole("region", { name: "Independent accounts" });
    await section.getByLabel("Email", { exact: true }).fill(email);
    await section.getByLabel("Name (optional)", { exact: true }).fill("Indie Person");
    await section.getByLabel("Workspace name (optional)").fill("Indie Person Co");
    await section.getByRole("button", { name: "Create independent account" }).click();
    await expect(section.getByText("Account created")).toBeVisible();
    // the team list doesn't gain them
    await expect(page.getByRole("list", { name: "Team members" })).not.toContainText(email);

    const { ctx, page: indie, mail } = await acceptInvite(browser, email, since);
    expect(mail.HTML).toContain("private Funnel Mapper Pro workspace");
    await expect(indie.getByText("Indie Person Co").first()).toBeVisible();
    await indie.goto("/clients");
    await expect(indie.getByRole("link", { name: /Sam Carter/ })).toHaveCount(0);
    await expect(indie.getByRole("link", { name: /Indie Client/ })).toHaveCount(0);
    await indie.goto("/settings");
    await expect(indie.getByRole("heading", { name: "Private workspace" })).toBeVisible();
    await ctx.close();
  });

  test("private sign-up link: unknown codes 404; the real one creates an independent workspace", async ({ page, browser }) => {
    test.setTimeout(120_000);
    // admins see the link in Settings
    await page.goto("/settings");
    const link = await page.getByTestId("join-url").innerText();
    const path = new URL(link).pathname;

    const anon = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const p = await anon.newPage();
    expect((await p.goto("/join/not-the-code"))!.status()).toBe(404);
    // the login page never links to sign-up
    await p.goto("/login");
    await expect(p.getByRole("link", { name: /sign up|create/i })).toHaveCount(0);

    const email = `joined.${Date.now()}@example.test`;
    const since = Date.now();
    await p.goto(path);
    await p.getByLabel("Your name").fill("Joined Person");
    await p.getByLabel("Email").fill(email);
    await p.getByLabel("Business or workspace name (optional)").fill("Joined Studio");
    await p.getByRole("button", { name: "Create workspace" }).click();
    await expect(p.getByRole("status")).toContainText("Check your email");
    await anon.close();

    const { ctx, page: joined } = await acceptInvite(browser, email, since);
    await expect(joined.getByText("Joined Studio").first()).toBeVisible();
    await joined.goto("/clients");
    await expect(joined.getByRole("link", { name: /Sam Carter/ })).toHaveCount(0);
    await ctx.close();
  });
});

test.describe("editor panels", () => {
  test("block library and details panel collapse and expand; the canvas takes the space and keeps working", async ({ page }) => {
    const { id } = await createFunnel({ template: "quiz" });
    await openEditor(page, id);
    const stage = page.locator(".fm-stage");
    const w0 = (await stage.boundingBox())!.width;
    const edges = await page.locator(".react-flow__edge").count();

    await page.getByRole("button", { name: "Collapse block library" }).click();
    await expect(page.locator("#fm-side")).toBeHidden();
    await expect.poll(async () => (await stage.boundingBox())!.width).toBeGreaterThan(w0 + 200);
    await page.getByRole("button", { name: "Collapse details panel" }).click();
    await expect(page.locator("#fm-insp")).toBeHidden();
    await expect.poll(async () => (await stage.boundingBox())!.width).toBeGreaterThan(w0 + 500);
    // the controls stay in the toolbar, labelled for expanding
    await expect(page.getByRole("button", { name: "Expand block library" })).toHaveAttribute("aria-expanded", "false");

    // canvas still works: select, zoom, minimap, Tidy Up (+ autosave), connections untouched
    const first = page.locator(".react-flow__node").first();
    await first.click();
    await expect(page.locator(".react-flow__node.selected")).toHaveCount(1);
    await expect(page.locator(".react-flow__minimap")).toBeVisible();
    const vp = page.locator(".react-flow__viewport");
    const before = await vp.getAttribute("style");
    await page.getByRole("button", { name: "Zoom in" }).click();
    await expect.poll(() => vp.getAttribute("style")).not.toBe(before);
    await page.getByRole("button", { name: "Tidy up" }).click();
    await waitSaved(page);
    await expect(page.locator(".react-flow__edge")).toHaveCount(edges);

    // remembered after a reload
    await page.reload();
    await expect(page.locator(".fm-saved")).toContainText("Saved");
    await expect(page.locator("#fm-side")).toBeHidden();
    await expect(page.locator("#fm-insp")).toBeHidden();

    // version history re-opens the right panel; both restore immediately
    await page.getByRole("button", { name: "Version history" }).click();
    await expect(page.locator("#fm-insp")).toBeVisible();
    await page.getByRole("button", { name: "Expand block library" }).click();
    await expect(page.locator("#fm-side")).toBeVisible();
    await expect(page.locator("#fm-side").getByRole("searchbox")).toBeVisible();
    await expect.poll(async () => (await stage.boundingBox())!.width).toBeLessThan(w0 + 5);
  });

  test("tablet keeps its drawers; the desktop toggles are hidden", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 });
    const { id } = await createFunnel({ template: "quiz" });
    await openEditor(page, id);
    await expect(page.getByRole("button", { name: "Collapse block library" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Collapse details panel" })).toBeHidden();
    await page.getByRole("button", { name: "Show building blocks" }).click();
    await expect(page.locator("#fm-side")).toBeInViewport();
  });
});
