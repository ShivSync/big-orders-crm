import { test, expect } from "@playwright/test";

test.describe("Sprint 7: Discovery Engine", () => {
  test("should load discovery page", async ({ page }) => {
    const response = await page.goto("/vi/discovery");
    test.skip(response?.status() === 404, "Discovery page not deployed yet");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1")).toContainText(/Khám phá|Discovery/);
  });

  test("should show store stats cards", async ({ page }) => {
    const response = await page.goto("/vi/discovery");
    test.skip(response?.status() === 404, "Discovery page not deployed yet");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("text=Cửa hàng")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Tổng đã khám phá")).toBeVisible({ timeout: 5000 });
  });

  test("should have store selector", async ({ page }) => {
    const response = await page.goto("/vi/discovery");
    test.skip(response?.status() === 404, "Discovery page not deployed yet");
    await page.waitForLoadState("domcontentloaded");

    const selector = page.locator('button[role="combobox"]').first();
    await expect(selector).toBeVisible();
  });

  test("should render map container", async ({ page }) => {
    const response = await page.goto("/vi/discovery");
    test.skip(response?.status() === 404, "Discovery page not deployed yet");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 10000 });
  });

  test("should load settings page", async ({ page }) => {
    const response = await page.goto("/vi/settings");
    test.skip(response?.status() === 404, "Settings page not deployed yet");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1")).toContainText(/Cài đặt|Settings/);
  });

  test("should show API key fields on settings page", async ({ page }) => {
    const response = await page.goto("/vi/settings");
    test.skip(response?.status() === 404, "Settings page not deployed yet");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("text=Google Places API Key")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Apify API Key")).toBeVisible();
    await expect(page.locator("text=Firecrawl API Key")).toBeVisible();
  });

  test("sidebar should have discovery and settings links", async ({ page }) => {
    await page.goto("/vi/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const discoveryLink = page.locator('nav a[href*="discovery"]');
    await expect(discoveryLink).toBeVisible();

    const settingsLink = page.locator('nav a[href*="settings"]');
    await expect(settingsLink).toBeVisible();
  });
});
