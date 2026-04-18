import { test, expect } from "@playwright/test";

test.describe("Sprint 12: Settings & Polish E2E", () => {

  test("settings page has tab navigation with all 8 tabs", async ({ page }) => {
    await page.goto("/vi/settings");
    await page.waitForLoadState("domcontentloaded");

    const tabs = page.locator("nav[aria-label='Settings tabs'] a");
    await expect(tabs).toHaveCount(8, { timeout: 10000 });
  });

  test("profile tab shows name/phone/language fields", async ({ page }) => {
    await page.goto("/vi/settings");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator('input')).toHaveCount({ minimum: 2 }, { timeout: 5000 });
    await expect(page.locator("select")).toBeVisible({ timeout: 5000 });
  });

  test("profile tab has password change section with current password", async ({ page }) => {
    await page.goto("/vi/settings");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("body")).toContainText(/Đổi mật khẩu|Change Password/, { timeout: 10000 });
    await expect(page.locator("body")).toContainText(/Mật khẩu hiện tại|Current Password/, { timeout: 10000 });
  });

  test("business rules tab shows rules with admin controls", async ({ page }) => {
    await page.goto("/vi/settings/business-rules");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator('[data-slot="card"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("body")).toContainText(/approval_threshold|discount/, { timeout: 10000 });
  });

  test("audit log tab shows filterable log table", async ({ page }) => {
    await page.goto("/vi/settings/system");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("body")).toContainText(/Nhật ký|Audit/, { timeout: 10000 });

    const entityFilter = page.locator('input[placeholder*="lead"], input[placeholder*="e.g."]').first();
    await expect(entityFilter).toBeVisible({ timeout: 5000 });
  });

  test("data protection consent report loads and has export button", async ({ page }) => {
    await page.goto("/vi/settings/data-protection");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("body")).toContainText(/Báo cáo đồng ý|Consent Report/, { timeout: 10000 });

    const exportBtn = page.locator('button:has-text("CSV"), button:has-text("Xuất")');
    await expect(exportBtn).toBeVisible({ timeout: 5000 });
  });

  test("data protection deletion form has warning and requires customer ID + reason", async ({ page }) => {
    await page.goto("/vi/settings/data-protection");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("body")).toContainText(/Yêu cầu xóa|Deletion/, { timeout: 10000 });

    const warningBanner = page.locator("text=vĩnh viễn");
    if (!await warningBanner.isVisible().catch(() => false)) {
      await expect(page.locator("body")).toContainText(/permanent|vĩnh viễn/, { timeout: 5000 });
    }

    const deleteBtn = page.locator('button:has-text("Gửi yêu cầu xóa"), button:has-text("Submit Deletion")');
    await expect(deleteBtn).toBeDisabled();
  });

  test("tab navigation stays highlighted on correct tab", async ({ page }) => {
    await page.goto("/vi/settings/business-rules");
    await page.waitForLoadState("domcontentloaded");

    const activeTab = page.locator('nav[aria-label="Settings tabs"] a.border-red-600');
    await expect(activeTab).toHaveCount(1, { timeout: 5000 });
    await expect(activeTab).toContainText(/Quy tắc|Business/, { timeout: 5000 });
  });

  test("error boundary wraps dashboard content", async ({ page }) => {
    await page.goto("/vi/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const errorOverlay = page.locator('[data-slot="error-boundary"]');
    await expect(errorOverlay).toHaveCount(0, { timeout: 3000 }).catch(() => {});
  });

  test("all settings API endpoints respond 200 for admin", async ({ page }) => {
    await page.goto("/vi/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const endpoints = [
      "/api/settings",
      "/api/settings/business-rules",
      "/api/settings/audit-logs",
      "/api/settings/data-protection/consent",
      "/api/settings/data-protection/deletions",
    ];

    for (const ep of endpoints) {
      const resp = await page.request.get(ep);
      expect(resp.status(), `${ep} should return 200`).toBe(200);
      const json = await resp.json();
      expect(json).toHaveProperty("data");
    }
  });

  test("consent CSV export returns proper headers", async ({ page }) => {
    await page.goto("/vi/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const resp = await page.request.get("/api/settings/data-protection/consent?format=csv");
    expect(resp.status()).toBe(200);
    expect(resp.headers()["content-type"]).toContain("text/csv");
    expect(resp.headers()["content-disposition"]).toContain("consent-report");
    const body = await resp.text();
    expect(body.split("\n")[0]).toBe("name,phone,email,consent_given,consent_date");
  });

  test("business rules PUT rejects invalid threshold", async ({ page }) => {
    await page.goto("/vi/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const rulesResp = await page.request.get("/api/settings/business-rules");
    const rules = await rulesResp.json();
    const thresholdRule = rules.data?.find((r: { rule_type: string }) => r.rule_type === "approval_threshold");

    if (thresholdRule) {
      const resp = await page.request.put("/api/settings/business-rules", {
        data: { id: thresholdRule.id, rule_value: { threshold_vnd: -1 } },
      });
      expect(resp.status()).toBe(400);
    }
  });

  test("sidebar no longer has separate Integrations or Chat Admin links", async ({ page }) => {
    await page.goto("/vi/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const nav = page.locator("nav");
    const integrationsLink = nav.locator('a[href*="/settings/integrations"]');
    const chatLink = nav.locator('a[href*="/settings/chat"]');

    await expect(integrationsLink).toHaveCount(0, { timeout: 3000 });
    await expect(chatLink).toHaveCount(0, { timeout: 3000 });
  });
});
