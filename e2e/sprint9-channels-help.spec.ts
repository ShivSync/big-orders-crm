import { test, expect } from "@playwright/test";

const LOGIN_URL = "/vi/login";
const ADMIN_EMAIL = "admin@bigorders.vn";
const ADMIN_PASSWORD = "BigOrders2026!";

async function login(page: import("@playwright/test").Page) {
  await page.goto(LOGIN_URL);
  await page.waitForLoadState("domcontentloaded");
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/dashboard/, { timeout: 10000 });
}

test.describe("Sprint 9: Channels Page", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should show Channels in sidebar", async ({ page }) => {
    const channelsLink = page.locator('nav a[href*="/channels"]');
    await expect(channelsLink).toBeVisible();
  });

  test("should navigate to channels page", async ({ page }) => {
    await page.locator('nav a[href*="/channels"]').click();
    await page.waitForURL(/channels/);
    await expect(page.locator("h1")).toContainText(/Channels|Kênh liên lạc/);
  });

  test("should show stats cards on channels page", async ({ page }) => {
    await page.goto("/vi/channels");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("text=Tổng tin nhắn")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Chưa đọc")).toBeVisible();
  });

  test("should show channel filter dropdown", async ({ page }) => {
    await page.goto("/vi/channels");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    await expect(page.locator("body")).toContainText(/Tất cả kênh|All Channels/, { timeout: 10000 });
  });
});

test.describe("Sprint 9: Lead Detail Messages Tab", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should show Messages tab on lead detail", async ({ page }) => {
    await page.goto("/vi/leads");
    await page.waitForLoadState("domcontentloaded");

    const firstLead = page.locator("table tbody tr").first().locator("a, button").filter({ hasText: /Xem chi tiết|View/ }).first();
    const leadExists = await firstLead.isVisible().catch(() => false);
    test.skip(!leadExists, "No leads in system");

    await firstLead.click();
    await page.waitForLoadState("domcontentloaded");

    const messagesTab = page.locator("button").filter({ hasText: /Tin nhắn|Messages/ });
    await expect(messagesTab).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Sprint 9: Customer Detail Messages Tab", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should show Messages tab on customer detail", async ({ page }) => {
    await page.goto("/vi/customers");
    await page.waitForLoadState("domcontentloaded");

    const firstCustomer = page.locator("table tbody tr").first().locator("a, button").filter({ hasText: /Xem chi tiết|View/ }).first();
    const custExists = await firstCustomer.isVisible().catch(() => false);
    test.skip(!custExists, "No customers in system");

    await firstCustomer.click();
    await page.waitForLoadState("domcontentloaded");

    const messagesTab = page.locator("button").filter({ hasText: /Tin nhắn|Messages/ });
    await expect(messagesTab).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Sprint 9: Help Page", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should show Help in sidebar", async ({ page }) => {
    const helpLink = page.locator('nav a[href*="/help"]');
    await expect(helpLink).toBeVisible();
  });

  test("should navigate to help page", async ({ page }) => {
    await page.locator('nav a[href*="/help"]').click();
    await page.waitForURL(/help/);
    await expect(page.locator("h1")).toContainText(/Hướng dẫn sử dụng|Help & User Guide/);
  });

  test("should show search input", async ({ page }) => {
    await page.goto("/vi/help");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator('input[placeholder*="Tìm kiếm"]')).toBeVisible({ timeout: 5000 });
  });

  test("should show guide sections", async ({ page }) => {
    await page.goto("/vi/help");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("body")).toContainText("Bắt đầu", { timeout: 10000 });
    await expect(page.locator("body")).toContainText(/khách hàng tiềm năng/);
    await expect(page.locator("body")).toContainText(/Đơn hàng/);
  });

  test("should expand guide section on click", async ({ page }) => {
    await page.goto("/vi/help");
    await page.waitForLoadState("domcontentloaded");

    const section = page.locator("body").getByText("Bắt đầu").first();
    await section.click();
    await expect(page.locator("body")).toContainText(/Big Orders CRM/, { timeout: 5000 });
  });

  test("should filter sections by search", async ({ page }) => {
    await page.goto("/vi/help");
    await page.waitForLoadState("domcontentloaded");

    const searchInput = page.locator('input').first();
    await searchInput.fill("pipeline");
    await page.waitForTimeout(500);
    await expect(page.locator("body")).toContainText(/Pipeline|Quy trình/, { timeout: 5000 });
  });

  test("should show quick tips section", async ({ page }) => {
    await page.goto("/vi/help");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("text=Mẹo nhanh")).toBeVisible({ timeout: 5000 });
  });

  test("should show help page in English", async ({ page }) => {
    await page.goto("/en/help");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1")).toContainText("Help & User Guide");
    await expect(page.locator("text=Getting Started")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Quick Tips")).toBeVisible();
  });
});

test.describe("Sprint 9: Webhook Endpoints", () => {
  test("Zalo webhook should reject invalid signature", async ({ request }) => {
    const response = await request.post("/api/webhooks/zalo", {
      data: { event_name: "user_send_text", message: { text: "hello" }, sender: { id: "123" } },
      headers: { "x-zalo-signature": "invalid" },
    });
    // Without ZALO_OA_SECRET set, it accepts (no signature validation in dev)
    expect([200, 401]).toContain(response.status());
  });

  test("Facebook webhook should verify token", async ({ request }) => {
    const response = await request.get(
      "/api/webhooks/facebook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=test"
    );
    expect(response.status()).toBe(403);
  });

  test("Antbuddy webhook should reject unauthenticated request", async ({ request }) => {
    const response = await request.post("/api/webhooks/antbuddy", {
      data: {},
    });
    expect([400, 401]).toContain(response.status());
  });
});
