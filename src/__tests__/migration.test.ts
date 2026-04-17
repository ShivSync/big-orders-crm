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

  describe("Sprint 4: Pipeline migration", () => {
    const sql = readFileSync(join(migrationsDir, "20260417500000_sprint4_pipeline.sql"), "utf-8");

    it("should create opportunities table", () => {
      expect(sql).toContain("CREATE TABLE opportunities");
    });

    it("should have all required columns", () => {
      expect(sql).toContain("lead_id uuid");
      expect(sql).toContain("customer_id uuid");
      expect(sql).toContain("title text NOT NULL");
      expect(sql).toContain("stage text NOT NULL");
      expect(sql).toContain("expected_value bigint");
      expect(sql).toContain("expected_date date");
      expect(sql).toContain("actual_value bigint");
      expect(sql).toContain("lost_reason text");
      expect(sql).toContain("assigned_to uuid");
      expect(sql).toContain("order_id uuid");
    });

    it("should have stage CHECK constraint with 6 values", () => {
      expect(sql).toContain("'new'");
      expect(sql).toContain("'consulting'");
      expect(sql).toContain("'quoted'");
      expect(sql).toContain("'negotiating'");
      expect(sql).toContain("'won'");
      expect(sql).toContain("'lost'");
    });

    it("should have foreign keys to leads, individual_customers, users", () => {
      expect(sql).toContain("REFERENCES leads(id)");
      expect(sql).toContain("REFERENCES individual_customers(id)");
      expect(sql).toContain("REFERENCES users(id)");
    });

    it("should enable RLS", () => {
      expect(sql).toContain("ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY");
    });

    it("should have RLS policies with pipeline permission checks", () => {
      expect(sql).toContain("pipeline.view");
      expect(sql).toContain("pipeline.create");
      expect(sql).toContain("pipeline.edit");
    });

    it("should have indexes on stage, lead_id, customer_id, assigned_to, expected_date", () => {
      expect(sql).toContain("idx_opportunities_stage");
      expect(sql).toContain("idx_opportunities_lead_id");
      expect(sql).toContain("idx_opportunities_customer_id");
      expect(sql).toContain("idx_opportunities_assigned_to");
      expect(sql).toContain("idx_opportunities_expected_date");
    });

    it("should have soft delete support", () => {
      expect(sql).toContain("deleted_at");
    });

    it("should seed pipeline permissions", () => {
      expect(sql).toContain("pipeline.view");
      expect(sql).toContain("pipeline.create");
      expect(sql).toContain("pipeline.edit");
      expect(sql).toContain("pipeline.delete");
    });
  });

  describe("Sprint 5: Orders & Menu migration", () => {
    const sql = readFileSync(join(migrationsDir, "20260417700000_sprint5_orders_menu.sql"), "utf-8");

    it("should create menu_categories table", () => {
      expect(sql).toContain("CREATE TABLE menu_categories");
    });

    it("should create menu_items table", () => {
      expect(sql).toContain("CREATE TABLE menu_items");
    });

    it("should create orders table", () => {
      expect(sql).toContain("CREATE TABLE orders");
    });

    it("should create order_items table with snapshot columns", () => {
      expect(sql).toContain("CREATE TABLE order_items");
      expect(sql).toMatch(/order_items[\s\S]*item_code text NOT NULL/);
      expect(sql).toMatch(/order_items[\s\S]*name_vi text NOT NULL/);
      expect(sql).toMatch(/order_items[\s\S]*name_en text NOT NULL/);
      expect(sql).toMatch(/order_items[\s\S]*unit_price bigint NOT NULL/);
    });

    it("should create order_status_history table", () => {
      expect(sql).toContain("CREATE TABLE order_status_history");
    });

    it("should have order_number UNIQUE constraint", () => {
      expect(sql).toContain("order_number text NOT NULL UNIQUE");
    });

    it("should have status CHECK with 6 values", () => {
      for (const s of ["draft", "confirmed", "preparing", "ready", "fulfilled", "cancelled"]) {
        expect(sql).toContain(`'${s}'`);
      }
    });

    it("should have payment_status CHECK with 3 values", () => {
      for (const s of ["unpaid", "partial", "paid"]) {
        expect(sql).toContain(`'${s}'`);
      }
    });

    it("should have event_type CHECK with 5 values", () => {
      for (const s of ["birthday", "corporate", "school_event", "meeting", "custom"]) {
        expect(sql).toContain(`'${s}'`);
      }
    });

    it("should have source CHECK with 6 values", () => {
      for (const s of ["crm", "landing_page", "phone", "zalo", "facebook", "oms_migrated"]) {
        expect(sql).toContain(`'${s}'`);
      }
    });

    it("should enable RLS on all tables", () => {
      expect(sql).toContain("ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY");
      expect(sql).toContain("ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY");
      expect(sql).toContain("ALTER TABLE orders ENABLE ROW LEVEL SECURITY");
      expect(sql).toContain("ALTER TABLE order_items ENABLE ROW LEVEL SECURITY");
      expect(sql).toContain("ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY");
    });

    it("should have indexes on order_number, store_id, status, customer_id, scheduled_date", () => {
      expect(sql).toContain("idx_orders_order_number");
      expect(sql).toContain("idx_orders_store_id");
      expect(sql).toContain("idx_orders_status");
      expect(sql).toContain("idx_orders_customer_id");
      expect(sql).toContain("idx_orders_scheduled_date");
    });

    it("should seed 3 menu categories", () => {
      expect(sql).toContain("combo_bo");
      expect(sql).toContain("combo_hde");
      expect(sql).toContain("alacard");
    });

    it("should seed menu items with item_code pattern CB-, CH-, AL-", () => {
      expect(sql).toContain("CB-001");
      expect(sql).toContain("CB-021");
      expect(sql).toContain("CH-001");
      expect(sql).toContain("CH-024");
      expect(sql).toContain("AL-001");
      expect(sql).toContain("AL-062");
    });

    it("should have all menu item prices > 0", () => {
      const priceMatches = sql.matchAll(/,\s*(\d+),\s*(?:'[^']*'|NULL),\s*\d+\)/g);
      for (const m of priceMatches) {
        expect(parseInt(m[1])).toBeGreaterThan(0);
      }
    });

    it("should seed orders permissions", () => {
      expect(sql).toContain("orders.view");
      expect(sql).toContain("orders.create");
      expect(sql).toContain("orders.edit");
      expect(sql).toContain("orders.delete");
      expect(sql).toContain("orders.approve");
    });

    it("should have RLS policies with orders permission checks", () => {
      expect(sql).toContain("orders_select");
      expect(sql).toContain("orders_insert");
      expect(sql).toContain("orders_update");
      expect(sql).toContain("orders_delete");
    });

    it("should have soft delete on orders", () => {
      expect(sql).toMatch(/orders[\s\S]*deleted_at/);
    });
  });

  describe("Sprint 6: Campaigns & Events migration", () => {
    const sql = readFileSync(join(migrationsDir, "20260417900000_sprint6_campaigns_events.sql"), "utf-8");

    it("should create campaigns table", () => {
      expect(sql).toContain("CREATE TABLE campaigns");
    });

    it("should create campaign_recipients table", () => {
      expect(sql).toContain("CREATE TABLE campaign_recipients");
    });

    it("should create recurring_events table", () => {
      expect(sql).toContain("CREATE TABLE recurring_events");
    });

    it("should have campaign status CHECK with 5 values", () => {
      for (const s of ["draft", "scheduled", "sending", "sent", "cancelled"]) {
        expect(sql).toContain(`'${s}'`);
      }
    });

    it("should have campaign_type CHECK with sms and email", () => {
      expect(sql).toContain("'sms'");
      expect(sql).toContain("'email'");
    });

    it("should have recipient status CHECK with 5 values", () => {
      for (const s of ["pending", "sent", "delivered", "failed", "bounced"]) {
        expect(sql).toContain(`'${s}'`);
      }
    });

    it("should have event_type CHECK with 4 values", () => {
      for (const s of ["birthday", "company_anniversary", "children_day", "custom"]) {
        expect(sql).toContain(`'${s}'`);
      }
    });

    it("should have FK from campaign_recipients to individual_customers", () => {
      expect(sql).toContain("REFERENCES individual_customers(id)");
    });

    it("should have FK from recurring_events to individual_customers", () => {
      expect(sql).toMatch(/recurring_events[\s\S]*REFERENCES individual_customers\(id\)/);
    });

    it("should enable RLS on all 3 tables", () => {
      expect(sql).toContain("ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY");
      expect(sql).toContain("ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY");
      expect(sql).toContain("ALTER TABLE recurring_events ENABLE ROW LEVEL SECURITY");
    });

    it("should have indexes on campaigns.status and campaign_recipients.(campaign_id, status)", () => {
      expect(sql).toContain("idx_campaigns_status");
      expect(sql).toContain("idx_campaign_recipients_campaign_id");
      expect(sql).toContain("idx_campaign_recipients_status");
    });

    it("should seed campaign permissions", () => {
      expect(sql).toContain("campaigns.view");
      expect(sql).toContain("campaigns.create");
      expect(sql).toContain("campaigns.edit");
      expect(sql).toContain("campaigns.delete");
      expect(sql).toContain("campaigns.send");
    });

    it("should seed event permissions", () => {
      expect(sql).toContain("events.view");
      expect(sql).toContain("events.create");
      expect(sql).toContain("events.edit");
      expect(sql).toContain("events.delete");
    });

    it("should have segment_filters jsonb column", () => {
      expect(sql).toContain("segment_filters jsonb");
    });

    it("should have soft delete on campaigns and recurring_events", () => {
      expect(sql).toMatch(/campaigns[\s\S]*deleted_at/);
      expect(sql).toMatch(/recurring_events[\s\S]*deleted_at/);
    });

    it("should grant permissions to marketing role", () => {
      expect(sql).toContain("'marketing'");
    });
  });
});
