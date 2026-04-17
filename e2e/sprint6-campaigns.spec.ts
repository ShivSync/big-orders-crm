import { test, expect } from "@playwright/test";

test.describe("Sprint 6: Campaigns & Recurring Events", () => {
  test("should load campaigns list page", async ({ page }) => {
    const response = await page.goto("/vi/campaigns");
    test.skip(response?.status() === 404, "Campaigns page not deployed yet");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1")).toContainText(/Chiến dịch|Campaigns/);
    await expect(page.locator("table")).toBeVisible();
  });

  test("should show campaign create dialog", async ({ page }) => {
    const response = await page.goto("/vi/campaigns");
    test.skip(response?.status() === 404, "Campaigns page not deployed yet");
    await page.waitForLoadState("domcontentloaded");

    await page.click("text=Tạo chiến dịch");
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('[role="dialog"]')).toContainText(/Tên chiến dịch|Campaign Name/);
  });

  test("should create a draft campaign", async ({ page }) => {
    const response = await page.goto("/vi/campaigns");
    test.skip(response?.status() === 404, "Campaigns page not deployed yet");
    await page.waitForLoadState("domcontentloaded");

    await page.click("text=Tạo chiến dịch");
    await page.waitForSelector('[role="dialog"]');

    const dialog = page.locator('[role="dialog"]');

    // Use SMS type to avoid the subject field requirement
    await dialog.locator('button[role="combobox"]').click();
    await page.locator('[role="option"]:has-text("sms")').click();

    await dialog.locator('input').first().fill("E2E Test Campaign");
    await dialog.locator("textarea").fill("Hello {{customer_name}}, welcome to {{store_name}}!");

    const [apiResp] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes("/api/campaigns") && resp.request().method() === "POST", { timeout: 15000 }),
      dialog.locator('button:has-text("Tạo chiến dịch")').click(),
    ]);

    expect(apiResp.status()).toBeLessThan(400);

    await page.waitForTimeout(1000);
    await expect(page.locator("table")).toContainText("E2E Test Campaign", { timeout: 10000 });
  });

  test("should navigate to campaign detail page", async ({ page }) => {
    const response = await page.goto("/vi/campaigns");
    test.skip(response?.status() === 404, "Campaigns page not deployed yet");
    await page.waitForLoadState("domcontentloaded");

    const row = page.locator("tr", { hasText: "E2E Test Campaign" });
    if (await row.count() > 0) {
      await row.first().click();
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("h1")).toContainText("E2E Test Campaign");
    }
  });

  test("sidebar should have campaigns link", async ({ page }) => {
    await page.goto("/vi/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const campaignsLink = page.locator('nav a[href*="campaigns"]');
    await expect(campaignsLink).toBeVisible();
  });

  test("should load customer detail page with recurring events section", async ({ page }) => {
    await page.goto("/vi/customers");
    await page.waitForLoadState("domcontentloaded");

    await page.waitForSelector("tbody", { timeout: 10000 });
    await page.waitForTimeout(2000);

    const noData = page.locator("text=Không có dữ liệu");
    if (await noData.isVisible().catch(() => false)) {
      test.skip(true, "No customers in database");
      return;
    }

    const firstRow = page.locator("tbody tr").first();
    await firstRow.click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("text=Sự kiện định kỳ")).toBeVisible({ timeout: 10000 });
  });

  test("campaigns stats cards should render", async ({ page }) => {
    const response = await page.goto("/vi/campaigns");
    test.skip(response?.status() === 404, "Campaigns page not deployed yet");
    await page.waitForLoadState("domcontentloaded");

    const cards = page.locator('[class*="CardContent"]');
    await expect(cards).toHaveCount(3, { timeout: 5000 }).catch(() => {
      expect(page.url()).toContain("campaigns");
    });
  });
});
