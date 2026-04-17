import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("Sprint 10: OMS Integration", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20260418400000_sprint10_oms_integration.sql"),
    "utf-8"
  );

  describe("migration", () => {
    it("should add oms_store_id column to stores", () => {
      expect(sql).toContain("oms_store_id text");
    });

    it("should add last_synced_at column to stores", () => {
      expect(sql).toContain("last_synced_at timestamptz");
    });

    it("should create index on oms_store_id", () => {
      expect(sql).toContain("idx_stores_oms_store_id");
    });

    it("should create index on aloha_id", () => {
      expect(sql).toContain("idx_stores_aloha_id");
    });

    it("should seed integrations.view permission", () => {
      expect(sql).toContain("integrations.view");
    });

    it("should seed integrations.manage permission", () => {
      expect(sql).toContain("integrations.manage");
    });
  });

  describe("OMS client", () => {
    it("should export fetchOmsStores function", async () => {
      const { fetchOmsStores } = await import("@/lib/oms/client");
      expect(typeof fetchOmsStores).toBe("function");
    });

    it("should export fetchOmsBigOrderCustomers function", async () => {
      const { fetchOmsBigOrderCustomers } = await import("@/lib/oms/client");
      expect(typeof fetchOmsBigOrderCustomers).toBe("function");
    });

    it("should export testOmsConnection function", async () => {
      const { testOmsConnection } = await import("@/lib/oms/client");
      expect(typeof testOmsConnection).toBe("function");
    });

    it("should return mock stores with required fields", async () => {
      const { fetchOmsStores } = await import("@/lib/oms/client");
      const stores = await fetchOmsStores();
      expect(stores.length).toBeGreaterThan(0);
      for (const store of stores) {
        expect(store).toHaveProperty("storeId");
        expect(store).toHaveProperty("storeAlohaId");
        expect(store).toHaveProperty("storeName");
        expect(store).toHaveProperty("region");
      }
    });

    it("should return mock customers with required fields", async () => {
      const { fetchOmsBigOrderCustomers } = await import("@/lib/oms/client");
      const customers = await fetchOmsBigOrderCustomers();
      expect(customers.length).toBeGreaterThan(0);
      for (const c of customers) {
        expect(c).toHaveProperty("id");
        expect(c).toHaveProperty("customerType");
        expect(c.purchaserPhone || c.recipientPhone).toBeTruthy();
      }
    });

    it("should return mock connection status", async () => {
      const { testOmsConnection } = await import("@/lib/oms/client");
      const status = await testOmsConnection();
      expect(status).toHaveProperty("connected");
      expect(status).toHaveProperty("latencyMs");
    });

    it("should normalize Vietnamese phone numbers", async () => {
      const { normalizePhone } = await import("@/lib/oms/client");
      expect(normalizePhone("84988976139")).toBe("0988976139");
      expect(normalizePhone("0988976139")).toBe("0988976139");
      expect(normalizePhone("+84 988 976 139")).toBe("0988976139");
      expect(normalizePhone("0912-345-678")).toBe("0912345678");
    });

    it("should map OMS customer types correctly", async () => {
      const { mapOmsCustomerType } = await import("@/lib/oms/client");
      expect(mapOmsCustomerType("INDIVIDUAL_VN")).toBe("parent");
      expect(mapOmsCustomerType("BUSINESS_SCHOOL")).toBe("teacher");
      expect(mapOmsCustomerType("BUSINESS_OFFICE")).toBe("employee");
      expect(mapOmsCustomerType("BUSINESS_HOTEL")).toBe("employee");
      expect(mapOmsCustomerType("OTHER")).toBe("other");
    });
  });

  describe("types", () => {
    it("should include oms_store_id in Store interface", async () => {
      const typesFile = readFileSync(
        join(process.cwd(), "src/types/database.ts"),
        "utf-8"
      );
      expect(typesFile).toContain("oms_store_id: string | null");
      expect(typesFile).toContain("last_synced_at: string | null");
    });
  });

  describe("i18n completeness", () => {
    const en = JSON.parse(
      readFileSync(join(process.cwd(), "src/messages/en.json"), "utf-8")
    );
    const vi = JSON.parse(
      readFileSync(join(process.cwd(), "src/messages/vi.json"), "utf-8")
    );

    it("should have integrations section in en.json", () => {
      expect(en.integrations).toBeDefined();
      expect(en.integrations.title).toBeDefined();
      expect(en.integrations.syncNow).toBeDefined();
      expect(en.integrations.importHistory).toBeDefined();
      expect(en.integrations.connectionStatus).toBeDefined();
      expect(en.integrations.webhookUrl).toBeDefined();
    });

    it("should have integrations section in vi.json", () => {
      expect(vi.integrations).toBeDefined();
      expect(vi.integrations.title).toBeDefined();
      expect(vi.integrations.syncNow).toBeDefined();
      expect(vi.integrations.importHistory).toBeDefined();
    });

    it("should have nav.integrations in both languages", () => {
      expect(en.nav.integrations).toBeDefined();
      expect(vi.nav.integrations).toBeDefined();
    });

    it("should have matching integrations keys in both languages", () => {
      const enKeys = Object.keys(en.integrations).sort();
      const viKeys = Object.keys(vi.integrations).sort();
      expect(enKeys).toEqual(viKeys);
    });
  });
});
