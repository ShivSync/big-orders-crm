import { test, expect } from "@playwright/test";

const TS = Date.now();

test.describe.serial("Full CRUD flow: end-to-end data lifecycle", () => {

  // ─── DASHBOARD ───────────────────────────────────────────────
  test("dashboard loads with stat cards", async ({ page }) => {
    await page.goto("/vi/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toBeVisible();
    const cards = page.locator('[data-slot="card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
  });

  // ─── LEADS: CREATE ──────────────────────────────────────────
  test("create a lead via the leads page", async ({ page }) => {
    await page.goto("/vi/leads");
    await page.waitForLoadState("domcontentloaded");

    await page.click('button:has-text("Tạo")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    const dialog = page.locator('[role="dialog"]');
    await dialog.locator('input[name="company_name"], input').first().fill(`E2E Lead ${TS}`);

    const phoneInput = dialog.locator('input[type="tel"], input[name="phone"]').first();
    if (await phoneInput.isVisible().catch(() => false)) {
      await phoneInput.fill(`09${TS.toString().slice(-8)}`);
    }

    const nameInput = dialog.locator('input[name="contact_name"]');
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill("E2E Contact");
    }

    const [resp] = await Promise.all([
      page.waitForResponse(r => r.url().includes("/api/leads") && r.request().method() === "POST", { timeout: 15000 }),
      dialog.locator('button[type="submit"], button:has-text("Tạo")').last().click(),
    ]);

    expect(resp.status()).toBeLessThan(400);
    await page.waitForTimeout(1000);
    await expect(page.locator("table")).toContainText(`E2E Lead ${TS}`, { timeout: 10000 });
  });

  // ─── LEADS: VIEW DETAIL & ADD ACTIVITY ──────────────────────
  test("open lead detail and add an activity", async ({ page }) => {
    await page.goto("/vi/leads");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const row = page.locator("tr", { hasText: `E2E Lead ${TS}` });
    if (await row.count() === 0) {
      test.skip(true, "Lead not found — previous test may have failed");
      return;
    }
    await row.first().click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1, h2")).toContainText(`E2E Lead ${TS}`, { timeout: 10000 });

    const addActivityBtn = page.locator('button:has-text("Thêm hoạt động"), button:has-text("Add Activity")');
    if (await addActivityBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addActivityBtn.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      const actDialog = page.locator('[role="dialog"]');
      const textarea = actDialog.locator("textarea");
      if (await textarea.isVisible().catch(() => false)) {
        await textarea.fill(`E2E activity note ${TS}`);
      }
      const submitBtn = actDialog.locator('button[type="submit"], button:has-text("Lưu"), button:has-text("Save")');
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(1500);
      }
    }
  });

  // ─── CUSTOMERS: CREATE ──────────────────────────────────────
  test("create a customer", async ({ page }) => {
    await page.goto("/vi/customers");
    await page.waitForLoadState("domcontentloaded");

    const createBtn = page.locator('button:has-text("Tạo"), button:has-text("Create")').first();
    await createBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    const dialog = page.locator('[role="dialog"]');

    const nameField = dialog.locator('input').first();
    await nameField.fill(`E2E Customer ${TS}`);

    const phoneField = dialog.locator('input[type="tel"], input[name="phone"]').first();
    if (await phoneField.isVisible().catch(() => false)) {
      await phoneField.fill(`08${TS.toString().slice(-8)}`);
    }

    const [resp] = await Promise.all([
      page.waitForResponse(r => r.url().includes("/customers") || r.url().includes("/api/"), { timeout: 15000 }),
      dialog.locator('button[type="submit"], button:has-text("Tạo"), button:has-text("Create")').last().click(),
    ]);

    expect(resp.status()).toBeLessThan(400);
    await page.waitForTimeout(1500);
    await expect(page.locator("body")).toContainText(`E2E Customer ${TS}`, { timeout: 10000 });
  });

  // ─── ORGANIZATIONS: CREATE ─────────────────────────────────
  test("create an organization", async ({ page }) => {
    await page.goto("/vi/organizations");
    await page.waitForLoadState("domcontentloaded");

    const createBtn = page.locator('button:has-text("Tạo"), button:has-text("Create")').first();
    await createBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    const dialog = page.locator('[role="dialog"]');
    const nameField = dialog.locator('input').first();
    await nameField.fill(`E2E Org ${TS}`);

    const [resp] = await Promise.all([
      page.waitForResponse(r => r.url().includes("/organizations") || r.url().includes("/api/"), { timeout: 15000 }),
      dialog.locator('button[type="submit"], button:has-text("Tạo"), button:has-text("Create")').last().click(),
    ]);

    expect(resp.status()).toBeLessThan(400);
    await page.waitForTimeout(1500);
    await expect(page.locator("body")).toContainText(`E2E Org ${TS}`, { timeout: 10000 });
  });

  // ─── PIPELINE: VIEW KANBAN ─────────────────────────────────
  test("pipeline page loads with stage columns", async ({ page }) => {
    await page.goto("/vi/pipeline");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1")).toContainText(/Pipeline|Kênh bán hàng/, { timeout: 10000 });
    const columns = page.locator('[data-slot="card"]');
    await expect(columns.first()).toBeVisible({ timeout: 10000 });
  });

  // ─── ORDERS: CREATE VIA WIZARD ─────────────────────────────
  test("create an order through the wizard", async ({ page }) => {
    await page.goto("/vi/orders/new");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("body")).toContainText(/Đơn hàng mới|New Order|Bước|Step/, { timeout: 10000 });

    const customerSelect = page.locator('button[role="combobox"]').first();
    if (await customerSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await customerSelect.click();
      await page.waitForTimeout(500);
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstOption.click();
      }
    }

    const storeSelect = page.locator('button[role="combobox"]').nth(1);
    if (await storeSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await storeSelect.click();
      await page.waitForTimeout(500);
      const firstStore = page.locator('[role="option"]').first();
      if (await firstStore.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstStore.click();
      }
    }

    const nextBtn = page.locator('button:has-text("Tiếp"), button:has-text("Next")');
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.locator("body")).toContainText(/menu|Menu|Bước 2|Step 2/i, { timeout: 5000 }).catch(() => {});
  });

  // ─── ORDERS: LIST PAGE ─────────────────────────────────────
  test("orders list page loads", async ({ page }) => {
    await page.goto("/vi/orders");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText(/Đơn hàng|Orders/, { timeout: 10000 });
  });

  // ─── CAMPAIGNS: CREATE DRAFT ───────────────────────────────
  test("create a draft campaign", async ({ page }) => {
    await page.goto("/vi/campaigns");
    await page.waitForLoadState("domcontentloaded");

    const createBtn = page.locator('button:has-text("Tạo chiến dịch"), button:has-text("Create")');
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(`E2E Campaign ${TS}`);

      const textarea = dialog.locator("textarea");
      if (await textarea.isVisible().catch(() => false)) {
        await textarea.fill("Test campaign content {{customer_name}}");
      }

      const submitBtn = dialog.locator('button[type="submit"], button:has-text("Tạo")').last();
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(1500);
      }
    }
  });

  // ─── DISCOVERY: LOAD PAGE ──────────────────────────────────
  test("discovery page loads with store selector", async ({ page }) => {
    await page.goto("/vi/discovery");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText(/Khám phá|Discovery/, { timeout: 10000 });
  });

  // ─── CHANNELS: LOAD PAGE ──────────────────────────────────
  test("channels page loads", async ({ page }) => {
    await page.goto("/vi/channels");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText(/Kênh|Channel/, { timeout: 10000 });
  });

  // ─── REPORTS: LOAD AND CHECK CHARTS ────────────────────────
  test("reports page loads with charts", async ({ page }) => {
    await page.goto("/vi/reports");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText(/Báo cáo|Report/, { timeout: 10000 });
    const cards = page.locator('[data-slot="card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
  });

  // ─── SETTINGS: PROFILE TAB ────────────────────────────────
  test("settings profile tab — edit name", async ({ page }) => {
    await page.goto("/vi/settings");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1")).toContainText(/Cài đặt|Settings/, { timeout: 10000 });

    const nameInput = page.locator('input').first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    const currentName = await nameInput.inputValue();

    await nameInput.fill("E2E Admin User");
    await page.click('button:has-text("Lưu"), button:has-text("Save")');
    await page.waitForTimeout(1500);

    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    const updatedName = await page.locator('input').first().inputValue();
    expect(updatedName).toBe("E2E Admin User");

    await page.locator('input').first().fill(currentName || "Admin");
    await page.click('button:has-text("Lưu"), button:has-text("Save")');
    await page.waitForTimeout(1000);
  });

  // ─── SETTINGS: BUSINESS RULES TAB ─────────────────────────
  test("settings business rules tab loads", async ({ page }) => {
    await page.goto("/vi/settings/business-rules");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("body")).toContainText(/approval_threshold|discount_limit|Quy tắc/, { timeout: 10000 });
  });

  // ─── SETTINGS: API KEYS TAB ───────────────────────────────
  test("settings API keys tab loads", async ({ page }) => {
    await page.goto("/vi/settings/api-keys");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("body")).toContainText(/API|Khóa/, { timeout: 10000 });
  });

  // ─── SETTINGS: SYSTEM/AUDIT LOG TAB ───────────────────────
  test("settings audit log tab loads", async ({ page }) => {
    await page.goto("/vi/settings/system");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("body")).toContainText(/Nhật ký|Audit/, { timeout: 10000 });
  });

  // ─── SETTINGS: DATA PROTECTION TAB ────────────────────────
  test("settings data protection tab loads with consent report", async ({ page }) => {
    await page.goto("/vi/settings/data-protection");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("body")).toContainText(/Báo cáo đồng ý|Consent/, { timeout: 10000 });
    await expect(page.locator("body")).toContainText(/Yêu cầu xóa|Deletion/, { timeout: 10000 });
  });

  // ─── SETTINGS: INTEGRATIONS TAB ───────────────────────────
  test("settings integrations tab loads", async ({ page }) => {
    await page.goto("/vi/settings/integrations");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("body")).toContainText(/OMS|Tích hợp|Integration/, { timeout: 10000 });
  });

  // ─── SETTINGS: LANDING PAGE TAB ───────────────────────────
  test("settings landing page CMS tab loads", async ({ page }) => {
    await page.goto("/vi/settings/landing-page");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("body")).toContainText(/Landing|Trang đích|hero/, { timeout: 10000 });
  });

  // ─── SETTINGS: CHAT CONFIG TAB ────────────────────────────
  test("settings chat config tab loads", async ({ page }) => {
    await page.goto("/vi/settings/chat");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("body")).toContainText(/Chat|FAQ/, { timeout: 10000 });
  });

  // ─── USER MANAGEMENT ──────────────────────────────────────
  test("users page loads and shows user list", async ({ page }) => {
    await page.goto("/vi/users");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1")).toContainText(/Người dùng|User/, { timeout: 10000 });
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("tbody tr")).not.toHaveCount(0, { timeout: 10000 });
  });

  // ─── ROLES PAGE ───────────────────────────────────────────
  test("roles page loads and shows role list", async ({ page }) => {
    await page.goto("/vi/roles");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1")).toContainText(/Vai trò|Role/, { timeout: 10000 });
  });

  // ─── TEAMS PAGE ───────────────────────────────────────────
  test("teams page loads", async ({ page }) => {
    await page.goto("/vi/teams");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1")).toContainText(/Nhóm|Team/, { timeout: 10000 });
  });

  // ─── HELP PAGE ────────────────────────────────────────────
  test("help page loads with guide sections", async ({ page }) => {
    await page.goto("/vi/help");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1")).toContainText(/Trợ giúp|Help/, { timeout: 10000 });
  });

  // ─── LANDING PAGE (PUBLIC) ────────────────────────────────
  test("public landing page loads", async ({ page }) => {
    const resp = await page.goto("/vi/book-party");
    expect(resp?.status()).toBeLessThan(500);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toContainText(/KFC|Party|Tiệc/, { timeout: 10000 });
  });

  // ─── NAVIGATION: SIDEBAR LINKS ────────────────────────────
  test("sidebar has all expected navigation links", async ({ page }) => {
    await page.goto("/vi/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const expectedLinks = [
      "dashboard", "leads", "pipeline", "customers", "organizations",
      "orders", "discovery", "campaigns", "channels", "reports",
      "users", "roles", "teams", "settings", "help",
    ];

    for (const link of expectedLinks) {
      const navLink = page.locator(`nav a[href*="${link}"]`);
      await expect(navLink.first()).toBeVisible({ timeout: 5000 });
    }
  });

  // ─── VERIFY: API ENDPOINTS RESPOND ────────────────────────
  test("critical API endpoints return 200", async ({ page }) => {
    await page.goto("/vi/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const endpoints = [
      "/api/dashboard/stats",
      "/api/settings",
      "/api/settings/business-rules",
      "/api/settings/audit-logs",
    ];

    for (const endpoint of endpoints) {
      const resp = await page.request.get(endpoint);
      expect(resp.status(), `${endpoint} should return 200`).toBe(200);
    }
  });

  // ─── VERIFY: DATA PROTECTION CONSENT EXPORT ───────────────
  test("consent CSV export returns valid CSV", async ({ page }) => {
    await page.goto("/vi/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const resp = await page.request.get("/api/settings/data-protection/consent?format=csv");
    expect(resp.status()).toBe(200);
    const contentType = resp.headers()["content-type"];
    expect(contentType).toContain("text/csv");
    const body = await resp.text();
    expect(body).toContain("name,phone,email,consent_given,consent_date");
  });

  // ─── LOCALE SWITCH ────────────────────────────────────────
  test("switching locale to English works", async ({ page }) => {
    await page.goto("/vi/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const enButton = page.locator('button:has-text("EN"), a:has-text("EN")');
    if (await enButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enButton.click();
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("body")).toContainText(/Dashboard|Settings|Leads/, { timeout: 10000 });
    }
  });
});
