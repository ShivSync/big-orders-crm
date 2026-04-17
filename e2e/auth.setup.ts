import { test as setup, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@bigorders.vn";
const ADMIN_PASSWORD = "BigOrders2026!";

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/vi/login");
  await page.waitForLoadState("domcontentloaded");

  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');

  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await expect(page).toHaveURL(/dashboard/);

  await page.context().storageState({ path: "e2e/.auth/admin.json" });
});
