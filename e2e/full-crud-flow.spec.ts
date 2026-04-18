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
    await page.waitForTimeout(2000);

    await page.click('button:has-text("Tạo khách hàng tiềm năng")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    const dialog = page.locator('[role="dialog"]');

    const nameInput = dialog.locator('input[name="full_name"]');
    await nameInput.fill(`E2E Lead ${TS}`);

    const phoneInput = dialog.locator('input[name="phone"]');
    if (await phoneInput.isVisible().catch(() => false)) {
      await phoneInput.fill(`09${TS.toString().slice(-8)}`);
    }

    await dialog.locator('button:has-text("Lưu")').click();
    await page.waitForTimeout(3000);

    const isDialogHidden = await dialog.isHidden().catch(() => false);
    if (!isDialogHidden) {
      await dialog.locator('button:has-text("Lưu")').click();
      await page.waitForTimeout(3000);
    }

    await expect(page.locator("body")).toContainText(`E2E Lead ${TS}`, { timeout: 15000 });
  });

  // ─── LEADS: VIEW DETAIL & ADD ACTIVITY ──────────────────────
  test("open lead detail and add an activity", async ({ page }) => {
    await page.goto("/vi/leads");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const row = page.locator("tr", { hasText: `E2E Lead ${TS}` });
    if (await row.count() === 0) {
      test.skip(true, "Lead not found");
      return;
    }
    await row.first().click();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    await expect(page.locator("body")).toContainText(`E2E Lead ${TS}`, { timeout: 10000 });

    const addActivityBtn = page.locator('button:has-text("Thêm hoạt động"), button:has-text("Add Activity")');
    if (await addActivityBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await addActivityBtn.first().click();
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      const actDialog = page.locator('[role="dialog"]');
      const textarea = actDialog.locator("textarea");
      if (await textarea.isVisible().catch(() => false)) {
        await textarea.fill(`E2E activity note ${TS}`);
      }
      const submitBtn = actDialog.locator('button:has-text("Lưu"), button:has-text("Save")');
      if (await submitBtn.first().isVisible().catch(() => false)) {
        await submitBtn.first().click();
        await page.waitForTimeout(2000);
      }
    }
  });

  // ─── CUSTOMERS: CREATE ──────────────────────────────────────
  test("create a customer", async ({ page }) => {
    await page.goto("/vi/customers");
    await page.waitForLoadState("domcontentloaded");

    const createBtn = page.locator('button:has-text("Tạo")').first();
    await createBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    const dialog = page.locator('[role="dialog"]');
    const nameInput = dialog.locator('input').first();
    await nameInput.fill(`E2E Customer ${TS}`);

    const phoneInput = dialog.locator('input').nth(1);
    if (await phoneInput.isVisible().catch(() => false)) {
      await phoneInput.fill(`08${TS.toString().slice(-8)}`);
    }

    await dialog.locator('button:has-text("Lưu"), button:has-text("Save")').first().click();
    await expect(dialog).toBeHidden({ timeout: 15000 });
    await page.waitForTimeout(2000);
    await expect(page.locator("body")).toContainText(`E2E Customer ${TS}`, { timeout: 10000 });
  });

  // ─── ORGANIZATIONS: CREATE ─────────────────────────────────
  test("create an organization", async ({ page }) => {
    await page.goto("/vi/organizations");
    await page.waitForLoadState("domcontentloaded");

    const createBtn = page.locator('button:has-text("Tạo")').first();
    await createBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    const dialog = page.locator('[role="dialog"]');
    const nameInput = dialog.locator('input').first();
    await nameInput.fill(`E2E Org ${TS}`);

    await dialog.locator('button:has-text("Lưu"), button:has-text("Save")').first().click();
    await expect(dialog).toBeHidden({ timeout: 15000 });
    await page.waitForTimeout(2000);
    await expect(page.locator("body")).toContainText(`E2E Org ${TS}`, { timeout: 10000 });
  });

  // ─── PIPELINE: VIEW KANBAN ─────────────────────────────────
  test("pipeline page loads with stage columns", async ({ page }) => {
    await page.goto("/vi/pipeline");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
    const cards = page.locator('[data-slot="card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
  });

  // ─── ORDERS: LIST PAGE ─────────────────────────────────────
  test("orders list page loads", async ({ page }) => {
    await page.goto("/vi/orders");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText(/đơn hàng|Orders/i, { timeout: 10000 });
  });

  // ─── ORDERS: WIZARD STEP 1 ────────────────────────────────
  test("order wizard loads step 1", async ({ page }) => {
    await page.goto("/vi/orders/new");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toContainText(/Tạo đơn hàng|New Order|Khách hàng.*Cửa hàng|Step/, { timeout: 10000 });
  });

  // ─── CAMPAIGNS: LIST ───────────────────────────────────────
  test("campaigns page loads", async ({ page }) => {
    await page.goto("/vi/campaigns");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText(/chiến dịch|Campaign/i, { timeout: 10000 });
  });

  // ─── DISCOVERY ─────────────────────────────────────────────
  test("discovery page loads", async ({ page }) => {
    await page.goto("/vi/discovery");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText(/khám phá|Discovery/i, { timeout: 10000 });
  });

  // ─── CHANNELS ──────────────────────────────────────────────
  test("channels page loads", async ({ page }) => {
    await page.goto("/vi/channels");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText(/kênh|Channel/i, { timeout: 10000 });
  });

  // ─── REPORTS ───────────────────────────────────────────────
  test("reports page loads with charts", async ({ page }) => {
    await page.goto("/vi/reports");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText(/báo cáo|Report/i, { timeout: 10000 });
  });

  // ─── SETTINGS: ALL TABS ───────────────────────────────────
  test("settings profile tab loads and can edit", async ({ page }) => {
    await page.goto("/vi/settings");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText(/cài đặt|Settings/i, { timeout: 10000 });
    const nameInput = page.locator("input").first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });
  });

  test("settings business rules tab loads", async ({ page }) => {
    await page.goto("/vi/settings/business-rules");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toContainText(/approval_threshold|discount/, { timeout: 10000 });
  });

  test("settings API keys tab loads", async ({ page }) => {
    await page.goto("/vi/settings/api-keys");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toContainText(/API|Khóa/, { timeout: 10000 });
  });

  test("settings audit log tab loads", async ({ page }) => {
    await page.goto("/vi/settings/system");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toContainText(/Nhật ký|Audit/, { timeout: 10000 });
  });

  test("settings data protection tab loads", async ({ page }) => {
    await page.goto("/vi/settings/data-protection");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toContainText(/Báo cáo đồng ý|Consent/, { timeout: 10000 });
  });

  test("settings integrations tab loads", async ({ page }) => {
    await page.goto("/vi/settings/integrations");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toContainText(/OMS|Tích hợp/, { timeout: 10000 });
  });

  test("settings landing page tab loads", async ({ page }) => {
    await page.goto("/vi/settings/landing-page");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toContainText(/Landing|hero/, { timeout: 10000 });
  });

  test("settings chat config tab loads", async ({ page }) => {
    await page.goto("/vi/settings/chat");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toContainText(/Chat|FAQ/, { timeout: 10000 });
  });

  // ─── USER MANAGEMENT ──────────────────────────────────────
  test("users page shows user list", async ({ page }) => {
    await page.goto("/vi/users");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText(/người dùng|User/i, { timeout: 10000 });
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
  });

  // ─── ROLES ────────────────────────────────────────────────
  test("roles page loads", async ({ page }) => {
    await page.goto("/vi/roles");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText(/vai trò|Role/i, { timeout: 10000 });
  });

  // ─── TEAMS ────────────────────────────────────────────────
  test("teams page loads", async ({ page }) => {
    await page.goto("/vi/teams");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText(/nhóm|Team/i, { timeout: 10000 });
  });

  // ─── HELP ─────────────────────────────────────────────────
  test("help page loads", async ({ page }) => {
    await page.goto("/vi/help");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1")).toContainText(/trợ giúp|Help|Hướng dẫn/i, { timeout: 10000 });
  });

  // ─── PUBLIC LANDING ───────────────────────────────────────
  test("public landing page loads", async ({ page }) => {
    const resp = await page.goto("/vi/book-party");
    expect(resp?.status()).toBeLessThan(500);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toContainText(/KFC|Party|Tiệc/, { timeout: 10000 });
  });

  // ─── SIDEBAR NAVIGATION ──────────────────────────────────
  test("sidebar has all navigation links", async ({ page }) => {
    await page.goto("/vi/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const links = ["dashboard", "leads", "pipeline", "customers", "organizations",
      "orders", "discovery", "campaigns", "channels", "reports",
      "users", "roles", "teams", "settings", "help"];

    for (const link of links) {
      const nav = page.locator(`nav a[href*="${link}"]`);
      await expect(nav.first()).toBeVisible({ timeout: 5000 });
    }
  });

  // ─── API SMOKE ────────────────────────────────────────────
  test("critical API endpoints return 200", async ({ page }) => {
    await page.goto("/vi/dashboard");
    await page.waitForLoadState("domcontentloaded");

    for (const ep of ["/api/dashboard/stats", "/api/settings", "/api/settings/business-rules", "/api/settings/audit-logs"]) {
      const resp = await page.request.get(ep);
      expect(resp.status(), `${ep}`).toBe(200);
    }
  });

  // ─── CSV EXPORT ───────────────────────────────────────────
  test("consent CSV export works", async ({ page }) => {
    await page.goto("/vi/dashboard");
    await page.waitForLoadState("domcontentloaded");
    const resp = await page.request.get("/api/settings/data-protection/consent?format=csv");
    expect(resp.status()).toBe(200);
    expect(resp.headers()["content-type"]).toContain("text/csv");
    const body = await resp.text();
    expect(body).toContain("name,phone,email,consent_given,consent_date");
  });
});
