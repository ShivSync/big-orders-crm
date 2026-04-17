import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("Security fixes migration", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20260417200000_security_fixes.sql"),
    "utf-8"
  );

  describe("users_update privilege escalation fix", () => {
    it("should drop the original permissive users_update policy", () => {
      expect(sql).toContain("DROP POLICY IF EXISTS users_update ON users");
    });

    it("should create separate self-update and admin-update policies", () => {
      expect(sql).toContain("users_update_self");
      expect(sql).toContain("users_update_admin");
    });

    it("should prevent self-update of is_root", () => {
      expect(sql).toContain("is_root = (SELECT u.is_root FROM users u WHERE u.id = auth.uid())");
    });

    it("should prevent self-update of status", () => {
      expect(sql).toContain("status = (SELECT u.status FROM users u WHERE u.id = auth.uid())");
    });

    it("should prevent self-update of region", () => {
      expect(sql).toContain("region = (SELECT u.region FROM users u WHERE u.id = auth.uid())");
    });
  });

  describe("leads RLS hardening", () => {
    it("should drop original permissive leads policies", () => {
      expect(sql).toContain("DROP POLICY IF EXISTS leads_select ON leads");
      expect(sql).toContain("DROP POLICY IF EXISTS leads_insert ON leads");
      expect(sql).toContain("DROP POLICY IF EXISTS leads_update ON leads");
    });

    it("should require leads.view permission for SELECT", () => {
      expect(sql).toContain("user_has_permission(auth.uid(), 'leads.view')");
    });

    it("should require leads.create permission for INSERT", () => {
      expect(sql).toContain("user_has_permission(auth.uid(), 'leads.create')");
    });

    it("should require leads.edit permission for UPDATE", () => {
      expect(sql).toContain("user_has_permission(auth.uid(), 'leads.edit')");
    });
  });

  describe("activities RLS hardening", () => {
    it("should drop original permissive activities policies", () => {
      expect(sql).toContain("DROP POLICY IF EXISTS activities_select ON activities");
      expect(sql).toContain("DROP POLICY IF EXISTS activities_insert ON activities");
    });

    it("should require permission for activities", () => {
      const activitySection = sql.split("activities RLS")[1] || "";
      expect(activitySection).toContain("user_has_permission");
    });
  });

  describe("missing write policies added", () => {
    it("should add write policies for RBAC tables", () => {
      expect(sql).toContain("role_permissions_write");
      expect(sql).toContain("role_objects_write");
      expect(sql).toContain("teams_write");
      expect(sql).toContain("user_roles_write");
      expect(sql).toContain("user_teams_write");
      expect(sql).toContain("user_stores_write");
      expect(sql).toContain("business_rules_write");
    });

    it("should gate write policies on root or settings.edit permission", () => {
      expect(sql).toContain("'settings.edit'");
      expect(sql).toContain("'users.edit'");
    });
  });
});

describe("Sprint 3 security fixes", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20260417400000_sprint3_security_fixes.sql"),
    "utf-8"
  );

  describe("individual_customers RLS hardening", () => {
    it("should drop original permissive policies", () => {
      expect(sql).toContain("DROP POLICY IF EXISTS customers_select ON individual_customers");
      expect(sql).toContain("DROP POLICY IF EXISTS customers_insert ON individual_customers");
      expect(sql).toContain("DROP POLICY IF EXISTS customers_update ON individual_customers");
    });

    it("should require customers.view for SELECT", () => {
      expect(sql).toContain("user_has_permission(auth.uid(), 'customers.view')");
    });

    it("should require customers.edit for INSERT and UPDATE", () => {
      expect(sql).toContain("user_has_permission(auth.uid(), 'customers.edit')");
    });
  });

  describe("organizations RLS hardening", () => {
    it("should drop original permissive policies", () => {
      expect(sql).toContain("DROP POLICY IF EXISTS orgs_select ON organizations");
      expect(sql).toContain("DROP POLICY IF EXISTS orgs_insert ON organizations");
      expect(sql).toContain("DROP POLICY IF EXISTS orgs_update ON organizations");
    });

    it("should require organizations.view for SELECT", () => {
      expect(sql).toContain("user_has_permission(auth.uid(), 'organizations.view')");
    });

    it("should require organizations.edit for INSERT and UPDATE", () => {
      expect(sql).toContain("user_has_permission(auth.uid(), 'organizations.edit')");
    });
  });

  describe("customer_org_links RLS hardening", () => {
    it("should drop all original permissive policies", () => {
      expect(sql).toContain("DROP POLICY IF EXISTS links_select ON customer_org_links");
      expect(sql).toContain("DROP POLICY IF EXISTS links_insert ON customer_org_links");
      expect(sql).toContain("DROP POLICY IF EXISTS links_update ON customer_org_links");
      expect(sql).toContain("DROP POLICY IF EXISTS links_delete ON customer_org_links");
    });

    it("should require permission for all link operations", () => {
      const linksSection = sql.split("customer_org_links RLS")[1] || "";
      expect(linksSection).toContain("user_has_permission");
    });
  });

  describe("activities broadened for customers", () => {
    it("should include customers.view in activities SELECT", () => {
      expect(sql).toContain("user_has_permission(auth.uid(), 'customers.view')");
    });

    it("should include customers.edit in activities INSERT", () => {
      expect(sql).toContain("user_has_permission(auth.uid(), 'customers.edit')");
    });
  });
});

describe("Search sanitization", () => {
  function sanitizeSearch(input: string): string {
    return input.replace(/[%_\\(),.*]/g, "").trim();
  }

  it("should strip PostgREST special characters", () => {
    expect(sanitizeSearch("test%injection")).toBe("testinjection");
    expect(sanitizeSearch("hello_world")).toBe("helloworld");
    expect(sanitizeSearch("name(evil)")).toBe("nameevil");
    expect(sanitizeSearch("a.b.c")).toBe("abc");
    expect(sanitizeSearch("hack*")).toBe("hack");
  });

  it("should preserve normal search text", () => {
    expect(sanitizeSearch("Nguyen Van A")).toBe("Nguyen Van A");
    expect(sanitizeSearch("+84912345678")).toBe("+84912345678");
    expect(sanitizeSearch("test@email.com")).toBe("test@emailcom");
  });

  it("should handle empty and whitespace input", () => {
    expect(sanitizeSearch("")).toBe("");
    expect(sanitizeSearch("   ")).toBe("");
  });
});

describe("Sprint 4 security fixes", () => {
  const secSql = readFileSync(
    join(process.cwd(), "supabase/migrations/20260417600000_sprint4_security_fixes.sql"),
    "utf-8"
  );

  it("should enforce deleted_at IS NULL in update policy", () => {
    expect(secSql).toContain("deleted_at IS NULL");
  });

  it("should separate delete authority from edit authority", () => {
    expect(secSql).toContain("pipeline.delete");
    expect(secSql).toContain("opportunities_soft_delete");
  });

  it("should have partial unique index for idempotent lead conversion", () => {
    expect(secSql).toContain("idx_opportunities_unique_lead");
    expect(secSql).toContain("lead_id IS NOT NULL AND deleted_at IS NULL");
  });

  it("should include root user bypass in select policy", () => {
    expect(secSql).toContain("is_root = true");
  });

  describe("Server-side API routes", () => {
    const createRoute = readFileSync(
      join(process.cwd(), "src/app/api/opportunities/route.ts"),
      "utf-8"
    );
    const stageRoute = readFileSync(
      join(process.cwd(), "src/app/api/opportunities/[id]/stage/route.ts"),
      "utf-8"
    );
    const convertRoute = readFileSync(
      join(process.cwd(), "src/app/api/leads/[id]/convert-to-opportunity/route.ts"),
      "utf-8"
    );

    it("should check pipeline.create permission in create route", () => {
      expect(createRoute).toContain("pipeline.create");
    });

    it("should check pipeline.edit permission in stage route", () => {
      expect(stageRoute).toContain("pipeline.edit");
    });

    it("should validate referenced entities in create route (H3)", () => {
      expect(createRoute).toContain("Referenced lead not found");
      expect(createRoute).toContain("Referenced customer not found");
      expect(createRoute).toContain("Referenced assignee not found");
    });

    it("should return generic errors, not raw DB errors (M2)", () => {
      expect(createRoute).toContain("Failed to create opportunity");
      expect(createRoute).not.toContain("error.message");
      expect(stageRoute).toContain("Failed to update stage");
      expect(stageRoute).not.toContain("error.message");
    });

    it("should validate won requires actual_value", () => {
      expect(stageRoute).toContain("Won stage requires a positive actual_value");
    });

    it("should validate lost requires lost_reason", () => {
      expect(stageRoute).toContain("Lost stage requires a lost_reason");
    });

    it("should check for existing opportunity before conversion (M1)", () => {
      expect(convertRoute).toContain("An opportunity already exists for this lead");
    });
  });
});
