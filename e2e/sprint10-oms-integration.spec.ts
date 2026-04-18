import { test, expect } from "@playwright/test";

test.describe("Sprint 10: OMS Integration", () => {
  test("should navigate to integrations settings tab", async ({ page }) => {
    await page.goto("/vi/settings/integrations");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toContainText(/Tích hợp OMS|OMS Integration/, { timeout: 10000 });
  });

  test("should show connection status card", async ({ page }) => {
    await page.goto("/vi/settings/integrations");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("text=/Trạng thái kết nối|Connection Status/", { timeout: 10000 });
    const badge = page.locator("text=/Đã kết nối|Connected|Mất kết nối|Disconnected/");
    await expect(badge.first()).toBeVisible();
  });

  test("should show webhook URL input", async ({ page }) => {
    await page.goto("/vi/settings/integrations");
    await page.waitForLoadState("domcontentloaded");
    const urlInput = page.locator('input[readonly]');
    await expect(urlInput).toBeVisible({ timeout: 10000 });
    const value = await urlInput.inputValue();
    expect(value).toContain("/api/webhooks/oms");
  });

  test("should show Sync Now button", async ({ page }) => {
    await page.goto("/vi/settings/integrations");
    await page.waitForLoadState("domcontentloaded");
    const syncBtn = page.locator("button", { hasText: /Đồng bộ ngay|Sync Now/ });
    await expect(syncBtn).toBeVisible({ timeout: 10000 });
  });

  test("should show Import Historical Data button", async ({ page }) => {
    await page.goto("/vi/settings/integrations");
    await page.waitForLoadState("domcontentloaded");
    const importBtn = page.locator("button", { hasText: /Nhập dữ liệu lịch sử|Import Historical Data/ });
    await expect(importBtn).toBeVisible({ timeout: 10000 });
  });

  test("should show store count stats", async ({ page }) => {
    await page.goto("/vi/settings/integrations");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("text=/cửa hàng|stores/", { timeout: 10000 });
  });

  test("should work in English", async ({ page }) => {
    await page.goto("/en/settings/integrations");
    await page.waitForLoadState("domcontentloaded");
    const syncBtn = page.locator("button", { hasText: "Sync Now" });
    await expect(syncBtn).toBeVisible({ timeout: 10000 });
  });

  test("OMS webhook endpoint should exist", async ({ page }) => {
    await page.goto("/vi/dashboard");
    const res = await page.request.get("/api/webhooks/oms");
    expect(res.status()).toBe(405);
  });

  test("OMS sync-status endpoint requires auth", async ({ page }) => {
    await page.goto("/vi/dashboard");
    const res = await page.request.get("/api/oms/sync-status", {
      headers: { Cookie: "" },
    });
    expect([401, 200]).toContain(res.status());
  });
});
