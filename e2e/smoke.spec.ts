import { test, expect } from "@playwright/test";

test.describe("Smoke tests: all sprint pages load", () => {
  const pages = [
    { name: "Dashboard", path: "/vi/dashboard" },
    { name: "Leads", path: "/vi/leads" },
    { name: "Pipeline", path: "/vi/pipeline" },
    { name: "Customers", path: "/vi/customers" },
    { name: "Organizations", path: "/vi/organizations" },
    { name: "Orders", path: "/vi/orders" },
    { name: "Campaigns", path: "/vi/campaigns" },
    { name: "Users", path: "/vi/users" },
    { name: "Roles", path: "/vi/roles" },
    { name: "Teams", path: "/vi/teams" },
  ];

  for (const p of pages) {
    test(`${p.name} page loads without error`, async ({ page }) => {
      const response = await page.goto(p.path);
      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState("domcontentloaded");
      const errorOverlay = page.locator("#nextjs__container_errors_overlay");
      await expect(errorOverlay).toHaveCount(0);
    });
  }
});
