import { expect, test as setup } from "@playwright/test";

setup("sign in as the demo user", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@layer2funnels.test");
  await page.getByLabel("Password").fill("demo-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
  await page.context().storageState({ path: "tests/e2e/.auth/demo.json" });
});
