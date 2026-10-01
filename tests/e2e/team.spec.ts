import { expect, test, type Browser } from "@playwright/test";

const MAILPIT = "http://127.0.0.1:54324";

async function signIn(browser: Browser, email: string, password = "demo-password") {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  return { ctx, page };
}

/** Latest email to `to` from the local Mailpit inbox. */
async function latestMail(to: string) {
  for (let i = 0; i < 30; i++) {
    const r = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const j = (await r.json()) as { messages: { ID: string }[] };
    if (j.messages?.length) {
      const m = await (await fetch(`${MAILPIT}/api/v1/message/${j.messages[0].ID}`)).json();
      return m as { Subject: string; HTML: string };
    }
    await new Promise((res) => setTimeout(res, 500));
  }
  throw new Error(`no email for ${to}`);
}

test.describe("team workspace", () => {
  test("a teammate sees the shared portfolio but no admin controls", async ({ browser }) => {
    const { ctx, page } = await signIn(browser, "teammate@layer2funnels.test");
    await expect(page).toHaveURL("/");
    await page.goto("/clients");
    await expect(page.getByRole("link", { name: /Sam Carter/ })).toBeVisible();
    await page.goto("/settings");
    await expect(page.getByRole("list", { name: "Team members" })).toContainText("demo@layer2funnels.test");
    await expect(page.getByText("Only admins can change it.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Deactivate" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Send invite" })).toHaveCount(0);
    await ctx.close();
  });

  test("a deactivated member is signed out with an explanation", async ({ browser }) => {
    const { ctx, page } = await signIn(browser, "former@layer2funnels.test");
    await expect(page).toHaveURL(/\/login\?error=/);
    await expect(page.getByText("Your access to this workspace has been removed")).toBeVisible();
    await page.goto("/clients");
    await expect(page).toHaveURL(/\/login/);
    await ctx.close();
  });

  test("admin invites a teammate, who accepts and gets in; admin can deactivate and reactivate", async ({ page, browser }) => {
    test.setTimeout(120_000);
    const email = `new.${Date.now()}@layer2funnels.test`;
    await page.goto("/settings");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Name (optional)").fill("New Teammate");
    await page.getByRole("button", { name: "Send invite" }).click();
    await expect(page.getByText("Invite sent")).toBeVisible();

    const mail = await latestMail(email);
    expect(mail.Subject).toContain("invited");
    const href = mail.HTML.match(/href="([^"]*\/auth\/confirm[^"]*)"/)![1].replace(/&amp;/g, "&");
    const url = new URL(href);
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const invitee = await ctx.newPage();
    await invitee.goto(url.pathname + url.search);
    await expect(invitee).toHaveURL(/\/update-password/);
    await invitee.getByLabel("New password").fill("welcome-aboard-1");
    await invitee.getByLabel("Confirm password").fill("welcome-aboard-1");
    await invitee.getByRole("button", { name: "Save password" }).click();
    await expect(invitee).toHaveURL("/");
    await invitee.goto("/clients");
    await expect(invitee.getByRole("link", { name: /Sam Carter/ })).toBeVisible();

    // admin removes their access
    await page.reload();
    const row = page.getByRole("listitem").filter({ hasText: email });
    page.once("dialog", (d) => d.accept());
    await row.getByRole("button", { name: "Deactivate" }).click();
    await expect(row).toContainText("Deactivated");
    await invitee.goto("/clients");
    await expect(invitee).toHaveURL(/\/login/);
    await row.getByRole("button", { name: "Reactivate" }).click();
    await expect(row.getByRole("button", { name: "Deactivate" })).toBeVisible();
    await ctx.close();
  });

  test("magic link sign-in for a team member", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await page.goto("/login");
    await page.getByRole("tab", { name: "Magic link" }).click();
    await page.getByLabel("Email").fill("teammate@layer2funnels.test");
    await page.getByRole("button", { name: "Email me a link" }).click();
    await expect(page.getByRole("status")).toContainText("sign-in link is on its way");
    const mail = await latestMail("teammate@layer2funnels.test");
    const href = mail.HTML.match(/href="([^"]*\/auth\/confirm[^"]*)"/)![1].replace(/&amp;/g, "&");
    const url = new URL(href);
    await page.goto(url.pathname + url.search);
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Hi");
    await ctx.close();
  });

  test("password reset by email", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await page.goto("/reset-password");
    await page.getByLabel("Email").fill("teammate@layer2funnels.test");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("status")).toContainText("reset link is on its way");
    const mail = await latestMail("teammate@layer2funnels.test");
    expect(mail.Subject).toContain("Reset");
    const href = mail.HTML.match(/href="([^"]*\/auth\/confirm[^"]*)"/)![1].replace(/&amp;/g, "&");
    const url = new URL(href);
    await page.goto(url.pathname + url.search);
    await expect(page).toHaveURL(/\/update-password/);
    await page.getByLabel("New password").fill("a-brand-new-pass-1");
    await page.getByLabel("Confirm password").fill("a-brand-new-pass-1");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page).toHaveURL("/");
    // change it back (Settings → Change password) so the demo account keeps its documented password
    await page.goto("/update-password");
    await page.getByLabel("New password").fill("demo-password");
    await page.getByLabel("Confirm password").fill("demo-password");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page).toHaveURL("/");
    await ctx.close();
  });
});
