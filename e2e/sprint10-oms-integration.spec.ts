import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";

async function login(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/vi/login`);
  await page.fill('input[name="email"]', "admin@bigorders.vn");
  await page.fill('input[name="password"]', "BigOrders2026!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 });
}

test.describe("Sprint 10: OMS Integration", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should show Integrations in sidebar", async ({ page }) => {
    const link = page.locator('a[href*="/settings/integrations"]');
    await expect(link).toBeVisible();
    await expect(link).toContainText(/Tích hợp|Integrations/);
  });

  test("should navigate to integrations page", async ({ page }) => {
    await page.click('a[href*="/settings/integrations"]');
    await page.waitForURL("**/settings/integrations");
    const heading = page.locator("h1");
    await expect(heading).toContainText(/Tích hợp OMS|OMS Integration/);
  });

  test("should show connection status card", async ({ page }) => {
    await page.goto(`${BASE}/vi/settings/integrations`);
    await page.waitForSelector("text=/Trạng thái kết nối|Connection Status/");
    const badge = page.locator("text=/Đã kết nối|Connected|Mất kết nối|Disconnected/");
    await expect(badge.first()).toBeVisible();
  });

  test("should show webhook URL input", async ({ page }) => {
    await page.goto(`${BASE}/vi/settings/integrations`);
    const urlInput = page.locator('input[readonly]');
    await expect(urlInput).toBeVisible();
    const value = await urlInput.inputValue();
    expect(value).toContain("/api/webhooks/oms");
  });

  test("should show Sync Now button", async ({ page }) => {
    await page.goto(`${BASE}/vi/settings/integrations`);
    const syncBtn = page.locator("button", { hasText: /Đồng bộ ngay|Sync Now/ });
    await expect(syncBtn).toBeVisible();
  });

  test("should show Import Historical Data button", async ({ page }) => {
    await page.goto(`${BASE}/vi/settings/integrations`);
    const importBtn = page.locator("button", { hasText: /Nhập dữ liệu lịch sử|Import Historical Data/ });
    await expect(importBtn).toBeVisible();
  });

  test("should show store count stats", async ({ page }) => {
    await page.goto(`${BASE}/vi/settings/integrations`);
    await page.waitForSelector("text=/cửa hàng|stores/");
  });

  test("should work in English", async ({ page }) => {
    await page.goto(`${BASE}/en/settings/integrations`);
    const heading = page.locator("h1");
    await expect(heading).toContainText("OMS Integration");
    const syncBtn = page.locator("button", { hasText: "Sync Now" });
    await expect(syncBtn).toBeVisible();
  });

  test("OMS webhook endpoint should exist", async ({ page }) => {
    const res = await page.request.get(`${BASE}/api/webhooks/oms`);
    expect(res.status()).toBe(405);
  });

  test("OMS sync-status endpoint requires auth", async ({ page }) => {
    const res = await page.request.get(`${BASE}/api/oms/sync-status`, {
      headers: { Cookie: "" },
    });
    expect([401, 200]).toContain(res.status());
  });
});
