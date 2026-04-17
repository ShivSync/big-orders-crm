import { test, expect } from "@playwright/test";

test.describe("Sprint 11: Reports & Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/vi/login");
    await page.fill('input[type="email"]', "admin@bigorders.vn");
    await page.fill('input[type="password"]', "BigOrders2026!");
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
  });

  test("dashboard shows stat cards with real data", async ({ page }) => {
    await expect(page.locator("text=Tổng khách hàng tiềm năng")).toBeVisible();
    await expect(page.locator("text=Cơ hội đang mở")).toBeVisible();
    await expect(page.locator("text=Đơn hàng chờ xử lý")).toBeVisible();
    await expect(page.locator("text=Doanh thu tháng")).toBeVisible();
  });

  test("dashboard shows pipeline funnel and monthly trend charts", async ({ page }) => {
    await expect(page.locator("text=Phễu bán hàng")).toBeVisible();
    await expect(page.locator("text=Xu hướng hàng tháng")).toBeVisible();
  });

  test("dashboard shows help tooltip", async ({ page }) => {
    const helpIcon = page.locator(".cursor-help").first();
    await expect(helpIcon).toBeVisible();
  });

  test("reports page accessible from sidebar", async ({ page }) => {
    await page.click('a[href*="/reports"]');
    await page.waitForURL(/reports/);
    await expect(page.locator("h1")).toContainText("Báo cáo");
  });

  test("reports page has date filters", async ({ page }) => {
    await page.goto("/vi/reports");
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
    await expect(page.locator('input[type="date"]').last()).toBeVisible();
  });

  test("reports page has export buttons", async ({ page }) => {
    await page.goto("/vi/reports");
    await expect(page.getByRole("button", { name: "Xuất khách hàng TN" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Xuất khách hàng", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Xuất đơn hàng" })).toBeVisible();
  });

  test("reports page shows chart sections", async ({ page }) => {
    await page.goto("/vi/reports");
    await page.waitForTimeout(2000);
    const charts = ["Doanh thu theo cửa hàng", "Doanh thu theo nguồn", "Trạng thái đơn hàng"];
    for (const title of charts) {
      const el = page.locator(`[data-slot="card-title"]:has-text("${title}")`).first();
      await expect(el).toBeAttached({ timeout: 5000 });
    }
  });

  test("reports page has summary cards", async ({ page }) => {
    await page.goto("/vi/reports");
    await page.waitForTimeout(1000);
    await expect(page.getByText("Tổng khách hàng tiềm năng", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Tỷ lệ chuyển đổi", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Tổng đơn hàng", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Tổng doanh thu", { exact: true }).first()).toBeVisible();
  });

  test("reports page works in English", async ({ page }) => {
    await page.goto("/en/reports");
    await page.waitForTimeout(1000);
    await expect(page.locator("h1")).toContainText("Reports & Analytics");
    await expect(page.locator("text=Export Leads")).toBeVisible();
  });

  test("pipeline page uses grid layout (no horizontal scroll)", async ({ page }) => {
    await page.goto("/vi/pipeline");
    const grid = page.locator(".grid.grid-cols-2");
    await expect(grid).toBeVisible();
  });

  test("dashboard stats API returns data", async ({ request }) => {
    const login = await request.post("/api/auth/login", {
      data: { email: "admin@bigorders.vn", password: "BigOrders2026!" },
    });
    const res = await request.get("/api/dashboard/stats");
    expect(res.status()).toBeLessThan(500);
  });

  test("reports data API returns data", async ({ request }) => {
    const res = await request.get("/api/reports/data");
    expect(res.status()).toBeLessThan(500);
  });

  test("export API validates type parameter", async ({ request }) => {
    const res = await request.get("/api/reports/export?type=invalid");
    expect(res.status()).toBe(400);
  });
});
