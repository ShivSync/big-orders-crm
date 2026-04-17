import { test, expect } from "@playwright/test";

test.describe("Sprint 8: Landing Page & Chat", () => {
  test("should load book-party page without auth", async ({ page }) => {
    const response = await page.goto("/vi/book-party");
    test.skip(response?.status() === 404, "Landing page not deployed yet");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1")).toContainText(/Tiệc lớn|Big Party/);
  });

  test("should show booking form", async ({ page }) => {
    const response = await page.goto("/vi/book-party");
    test.skip(response?.status() === 404, "Landing page not deployed yet");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("#booking-form")).toBeVisible();
    await expect(page.locator('input[type="tel"]')).toBeVisible();
  });

  test("should show chat bubble", async ({ page }) => {
    const response = await page.goto("/vi/book-party");
    test.skip(response?.status() === 404, "Landing page not deployed yet");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator('button[aria-label="Chat"]')).toBeVisible();
  });

  test("should open chat widget on click", async ({ page }) => {
    const response = await page.goto("/vi/book-party");
    test.skip(response?.status() === 404, "Landing page not deployed yet");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('button[aria-label="Chat"]').click();
    await expect(page.locator("text=Chat với KFC")).toBeVisible({ timeout: 5000 });
  });

  test("should submit booking form", async ({ page }) => {
    const response = await page.goto("/vi/book-party");
    test.skip(response?.status() === 404, "Landing page not deployed yet");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("#booking-form").scrollIntoViewIfNeeded();
    await page.locator('input[type="tel"]').fill("0901234567");

    const nameInputs = page.locator("#booking-form input").first();
    await nameInputs.fill("Test User E2E");

    const [apiResp] = await Promise.all([
      page.waitForResponse(
        resp => resp.url().includes("/api/leads/public") && resp.request().method() === "POST",
        { timeout: 10000 }
      ),
      page.locator('#booking-form button[type="submit"]').click(),
    ]);
    expect(apiResp.status()).toBe(200);
  });

  test("should show hero and features sections", async ({ page }) => {
    const response = await page.goto("/vi/book-party");
    test.skip(response?.status() === 404, "Landing page not deployed yet");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("text=260+")).toBeVisible();
    await expect(page.locator("text=89,000đ")).toBeVisible();
  });

  test("should show menu showcase", async ({ page }) => {
    const response = await page.goto("/vi/book-party");
    test.skip(response?.status() === 404, "Landing page not deployed yet");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("text=Thực đơn tiệc nổi bật")).toBeVisible();
  });

  test("public lead API should accept valid request", async ({ request }) => {
    const response = await request.post("/api/leads/public", {
      data: {
        name: "API Test User",
        phone: "0901234568",
        event_type: "birthday",
        guest_count: 30,
      },
    });
    test.skip(response.status() === 404, "API not deployed yet");
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.lead_id).toBeTruthy();
  });

  test("public lead API should reject invalid phone", async ({ request }) => {
    const response = await request.post("/api/leads/public", {
      data: { name: "Test", phone: "abc" },
    });
    test.skip(response.status() === 404, "API not deployed yet");
    expect(response.status()).toBe(400);
  });

  test("embed API should accept valid request with CORS", async ({ request }) => {
    const response = await request.post("/api/leads/embed", {
      data: {
        name: "Embed Test",
        phone: "0901234569",
        event_type: "corporate",
      },
    });
    test.skip(response.status() === 404, "API not deployed yet");
    expect(response.status()).toBe(200);
  });

  test("sidebar should have chat link", async ({ page }) => {
    await page.goto("/vi/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const chatLink = page.locator('nav a[href*="settings/chat"]');
    await expect(chatLink).toBeVisible();
  });
});
