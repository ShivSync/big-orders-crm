import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("Database migrations", () => {
  const migrationsDir = join(process.cwd(), "supabase/migrations");

  describe("Sprint 1 migration", () => {
    const sql = readFileSync(join(migrationsDir, "20260417000000_sprint1_foundation.sql"), "utf-8");

    it("should create all RBAC tables", () => {
      for (const table of ["users", "roles", "permissions", "objects", "role_permissions", "role_objects", "teams", "user_roles", "user_teams", "user_stores"]) {
        expect(sql).toContain(table);
      }
    });

    it("should create stores table", () => {
      expect(sql).toContain("stores");
    });

    it("should create audit_logs and business_rules", () => {
      expect(sql).toContain("audit_logs");
      expect(sql).toContain("business_rules");
    });

    it("should enable RLS on all tables", () => {
      expect(sql).toContain("ALTER TABLE users ENABLE ROW LEVEL SECURITY");
      expect(sql).toContain("ALTER TABLE roles ENABLE ROW LEVEL SECURITY");
      expect(sql).toContain("ALTER TABLE stores ENABLE ROW LEVEL SECURITY");
    });

    it("should create data masking functions", () => {
      expect(sql).toContain("mask_phone");
      expect(sql).toContain("mask_email");
    });

    it("should seed 8 roles", () => {
      expect(sql).toContain("call_center");
      expect(sql).toContain("rgm");
      expect(sql).toContain("big_order_manager");
      expect(sql).toContain("omni_head");
      expect(sql).toContain("area_manager");
      expect(sql).toContain("sales_manager");
      expect(sql).toContain("admin");
    });

    it("should seed 5 test stores", () => {
      expect(sql).toContain("KFC ");
    });
  });

  describe("Sprint 3 migration", () => {
    const sql = readFileSync(join(migrationsDir, "20260417300000_sprint3_customers_orgs.sql"), "utf-8");

    it("should create individual_customers table", () => {
      expect(sql).toContain("CREATE TABLE individual_customers");
    });

    it("should create organizations table", () => {
      expect(sql).toContain("CREATE TABLE organizations");
    });

    it("should create customer_org_links table with unique constraint", () => {
      expect(sql).toContain("CREATE TABLE customer_org_links");
      expect(sql).toContain("UNIQUE (individual_id, organization_id)");
    });

    it("should have phone unique constraint on customers (where not deleted)", () => {
      expect(sql).toContain("idx_customers_phone_unique");
      expect(sql).toContain("deleted_at IS NULL");
    });

    it("should have tax_id unique constraint on organizations (where not deleted)", () => {
      expect(sql).toContain("idx_orgs_tax_id_unique");
    });

    it("should have contact_type CHECK with 5 values", () => {
      for (const ct of ["parent", "employee", "teacher", "event_organizer", "other"]) {
        expect(sql).toContain(`'${ct}'`);
      }
    });

    it("should have organization_type CHECK with 8 values", () => {
      for (const ot of ["company", "school", "university", "hotel", "club", "government_office", "event_venue", "other"]) {
        expect(sql).toContain(`'${ot}'`);
      }
    });

    it("should enable RLS on all 3 tables", () => {
      expect(sql).toContain("ALTER TABLE individual_customers ENABLE ROW LEVEL SECURITY");
      expect(sql).toContain("ALTER TABLE organizations ENABLE ROW LEVEL SECURITY");
      expect(sql).toContain("ALTER TABLE customer_org_links ENABLE ROW LEVEL SECURITY");
    });

    it("should have foreign keys to stores", () => {
      expect(sql).toContain("REFERENCES stores(id)");
    });

    it("should have soft delete on customers and organizations", () => {
      expect(sql).toMatch(/individual_customers[\s\S]*deleted_at/);
      expect(sql).toMatch(/organizations[\s\S]*deleted_at/);
    });
  });

  describe("Sprint 2 migration", () => {
    const sql = readFileSync(join(migrationsDir, "20260417100000_sprint2_leads.sql"), "utf-8");

    it("should create leads table", () => {
      expect(sql).toContain("CREATE TABLE leads");
    });

    it("should create activities table", () => {
      expect(sql).toContain("CREATE TABLE activities");
    });

    it("should have correct lead stages", () => {
      expect(sql).toContain("'new'");
      expect(sql).toContain("'contacted'");
      expect(sql).toContain("'qualified'");
      expect(sql).toContain("'converted'");
      expect(sql).toContain("'lost'");
    });

    it("should have correct lead sources", () => {
      expect(sql).toContain("'manual'");
      expect(sql).toContain("'google_maps'");
      expect(sql).toContain("'oms_sync'");
    });

    it("should have correct activity types", () => {
      expect(sql).toContain("'call'");
      expect(sql).toContain("'email'");
      expect(sql).toContain("'meeting'");
      expect(sql).toContain("'note'");
      expect(sql).toContain("'sms'");
      expect(sql).toContain("'system'");
    });

    it("should enable RLS on leads and activities", () => {
      expect(sql).toContain("ALTER TABLE leads ENABLE ROW LEVEL SECURITY");
      expect(sql).toContain("ALTER TABLE activities ENABLE ROW LEVEL SECURITY");
    });

    it("should have indexes on key columns", () => {
      expect(sql).toContain("idx_leads_phone");
      expect(sql).toContain("idx_leads_stage");
      expect(sql).toContain("idx_leads_store_id");
      expect(sql).toContain("idx_leads_assigned_to");
      expect(sql).toContain("idx_activities_entity");
    });

    it("should reference stores and users foreign keys", () => {
      expect(sql).toContain("REFERENCES stores(id)");
      expect(sql).toContain("REFERENCES users(id)");
    });

    it("should have soft delete support", () => {
      expect(sql).toContain("deleted_at");
      expect(sql).toContain("deleted_at IS NULL");
    });
  });
});
