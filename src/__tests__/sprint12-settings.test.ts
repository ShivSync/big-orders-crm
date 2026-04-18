import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const root = process.cwd();

function readFile(path: string): string {
  return readFileSync(join(root, path), "utf-8");
}

describe("Sprint 12: Settings & Polish", () => {
  describe("settings layout with tabs", () => {
    const layout = readFile("src/app/[locale]/(dashboard)/settings/layout.tsx");

    it("should have tab navigation", () => {
      expect(layout).toContain("settingsTabs");
      expect(layout).toContain("profile");
      expect(layout).toContain("businessRules");
      expect(layout).toContain("apiKeys");
      expect(layout).toContain("system");
      expect(layout).toContain("dataProtection");
    });

    it("should highlight active tab", () => {
      expect(layout).toContain("border-red-600");
      expect(layout).toContain("usePathname");
    });
  });

  describe("profile page", () => {
    const profile = readFile("src/app/[locale]/(dashboard)/settings/page.tsx");

    it("should have profile form fields", () => {
      expect(profile).toContain("fullName");
      expect(profile).toContain("phone");
      expect(profile).toContain("languagePreference");
    });

    it("should support password change", () => {
      expect(profile).toContain("changePassword");
      expect(profile).toContain("newPassword");
      expect(profile).toContain("confirmPassword");
      expect(profile).toContain("updateUser");
    });

    it("should validate password", () => {
      expect(profile).toContain("passwordMismatch");
      expect(profile).toContain("passwordTooShort");
      expect(profile).toContain("length < 8");
    });

    it("should use toast for feedback", () => {
      expect(profile).toContain('import { toast } from "sonner"');
    });

    it("should require current password re-authentication before changing password (Codex H1)", () => {
      expect(profile).toContain("currentPassword");
      expect(profile).toContain("signInWithPassword");
      expect(profile).toContain("currentPasswordRequired");
      expect(profile).toContain("currentPasswordWrong");
    });
  });

  describe("business rules page", () => {
    const rules = readFile("src/app/[locale]/(dashboard)/settings/business-rules/page.tsx");

    it("should fetch rules from API", () => {
      expect(rules).toContain("/api/settings/business-rules");
    });

    it("should show read-only message for non-admins", () => {
      expect(rules).toContain("businessRulesReadOnly");
      expect(rules).toContain("isAdmin");
    });

    it("should handle threshold and discount edits", () => {
      expect(rules).toContain("threshold_vnd");
      expect(rules).toContain("max_pct");
    });
  });

  describe("business rules API", () => {
    const api = readFile("src/app/api/settings/business-rules/route.ts");

    it("should check permissions on GET", () => {
      expect(api).toContain("user_has_permission");
      expect(api).toContain("settings.view");
    });

    it("should restrict PUT to root users", () => {
      expect(api).toContain("is_root");
      expect(api).toContain('"Forbidden"');
    });
  });

  describe("audit log page", () => {
    const system = readFile("src/app/[locale]/(dashboard)/settings/system/page.tsx");

    it("should support filtering", () => {
      expect(system).toContain("filterEntity");
      expect(system).toContain("filterAction");
    });

    it("should support pagination", () => {
      expect(system).toContain("PAGE_SIZE");
      expect(system).toContain("setPage");
      expect(system).toContain("hasMore");
    });

    it("should show expandable detail rows", () => {
      expect(system).toContain("expandedId");
      expect(system).toContain("old_data");
      expect(system).toContain("new_data");
    });
  });

  describe("audit logs API", () => {
    const api = readFile("src/app/api/settings/audit-logs/route.ts");

    it("should restrict to root users only", () => {
      expect(api).toContain("is_root");
      expect(api).toContain('"Forbidden"');
    });

    it("should use service client for bypass RLS", () => {
      expect(api).toContain("createServiceClient");
    });

    it("should enrich logs with user names", () => {
      expect(api).toContain("user_name");
      expect(api).toContain("userMap");
    });
  });

  describe("data protection - consent report", () => {
    const consent = readFile("src/app/api/settings/data-protection/consent/route.ts");

    it("should restrict to root users", () => {
      expect(consent).toContain("is_root");
    });

    it("should support CSV export", () => {
      expect(consent).toContain("text/csv");
      expect(consent).toContain("Content-Disposition");
    });

    it("should filter by consent status", () => {
      expect(consent).toContain("consent_given");
      expect(consent).toContain("consent");
    });

    it("should limit CSV export to 5000 rows", () => {
      expect(consent).toContain("5000");
    });
  });

  describe("data protection - deletion requests", () => {
    const deletions = readFile("src/app/api/settings/data-protection/deletions/route.ts");

    it("should restrict to root users", () => {
      expect(deletions).toContain("is_root");
    });

    it("should soft-delete customers", () => {
      expect(deletions).toContain("deleted_at");
      expect(deletions).toContain("deletion_request");
    });

    it("should log deletions to audit_logs", () => {
      expect(deletions).toContain("audit_logs");
      expect(deletions).toContain("deletion_request");
    });
  });

  describe("data protection UI", () => {
    const dp = readFile("src/app/[locale]/(dashboard)/settings/data-protection/page.tsx");

    it("should have consent report", () => {
      expect(dp).toContain("consentReport");
      expect(dp).toContain("exportCsv");
    });

    it("should have deletion request form", () => {
      expect(dp).toContain("deletionRequests");
      expect(dp).toContain("submitDeletion");
      expect(dp).toContain("deletionWarning");
    });
  });

  describe("cross-sprint polish", () => {
    it("should have skeleton component", () => {
      expect(existsSync(join(root, "src/components/ui/skeleton.tsx"))).toBe(true);
      const skeleton = readFile("src/components/ui/skeleton.tsx");
      expect(skeleton).toContain("animate-pulse");
      expect(skeleton).toContain("PageSkeleton");
      expect(skeleton).toContain("TableSkeleton");
      expect(skeleton).toContain("CardSkeleton");
    });

    it("should have error boundary component", () => {
      expect(existsSync(join(root, "src/components/ui/error-boundary.tsx"))).toBe(true);
      const eb = readFile("src/components/ui/error-boundary.tsx");
      expect(eb).toContain("getDerivedStateFromError");
      expect(eb).toContain("Try again");
    });

    it("should have loading.tsx for dashboard routes", () => {
      expect(existsSync(join(root, "src/app/[locale]/(dashboard)/loading.tsx"))).toBe(true);
    });

    it("should wrap dashboard content in error boundary", () => {
      const layout = readFile("src/app/[locale]/(dashboard)/layout.tsx");
      expect(layout).toContain("ErrorBoundaryWrapper");
    });
  });

  describe("security hardening", () => {
    it("should not expose service role key in client code", () => {
      const clientSupabase = readFile("src/lib/supabase/client.ts");
      expect(clientSupabase).not.toContain("SERVICE_ROLE");
      expect(clientSupabase).not.toContain("service_role");
    });

    it("should apply PII masking on customer detail page", () => {
      const customerDetail = readFile("src/app/[locale]/(dashboard)/customers/[id]/page.tsx");
      expect(customerDetail).toContain("maskPhone");
      expect(customerDetail).toContain("maskEmail");
    });

    it("should apply PII masking on organization detail page", () => {
      const orgDetail = readFile("src/app/[locale]/(dashboard)/organizations/[id]/page.tsx");
      expect(orgDetail).toContain("maskPhone");
    });

    it("should have rate limiting on public endpoints", () => {
      const publicLead = readFile("src/app/api/leads/public/route.ts");
      expect(publicLead).toContain("checkRateLimit");
    });

    it("should sanitize CSV output against formula injection (Codex H2)", () => {
      const consent = readFile("src/app/api/settings/data-protection/consent/route.ts");
      expect(consent).toContain("sanitizeCsvCell");
      expect(consent).toContain("=+\\-@");
    });

    it("should validate business rule values by type (Codex M1)", () => {
      const rules = readFile("src/app/api/settings/business-rules/route.ts");
      expect(rules).toContain("threshold_vnd");
      expect(rules).toContain("max_pct");
      expect(rules).toContain("10_000_000_000");
      expect(rules).toContain("Rule not found");
    });

    it("should check audit insert result on deletion (Codex M2)", () => {
      const deletions = readFile("src/app/api/settings/data-protection/deletions/route.ts");
      expect(deletions).toContain("auditError");
      expect(deletions).toContain("audit logging failed");
    });

    it("should clamp pagination params (Codex M3)", () => {
      const auditLogs = readFile("src/app/api/settings/audit-logs/route.ts");
      expect(auditLogs).toContain("Math.max(0,");
      expect(auditLogs).toContain("Math.min(100,");
    });

    it("should sanitize search input in consent filter (Codex M4)", () => {
      const consent = readFile("src/app/api/settings/data-protection/consent/route.ts");
      expect(consent).toContain("sanitized");
      expect(consent).toContain(".replace(");
    });
  });

  describe("i18n completeness", () => {
    const en = JSON.parse(readFileSync(join(root, "src/messages/en.json"), "utf-8"));
    const vi = JSON.parse(readFileSync(join(root, "src/messages/vi.json"), "utf-8"));

    it("should have settings tabs in both languages", () => {
      expect(en.settings.tabs).toBeDefined();
      expect(vi.settings.tabs).toBeDefined();
      expect(Object.keys(en.settings.tabs)).toEqual(Object.keys(vi.settings.tabs));
    });

    it("should have profile keys in both languages", () => {
      expect(en.settings.fullName).toBeDefined();
      expect(vi.settings.fullName).toBeDefined();
      expect(en.settings.changePassword).toBeDefined();
      expect(vi.settings.changePassword).toBeDefined();
    });

    it("should have data protection keys in both languages", () => {
      expect(en.settings.consentReport).toBeDefined();
      expect(vi.settings.consentReport).toBeDefined();
      expect(en.settings.deletionRequests).toBeDefined();
      expect(vi.settings.deletionRequests).toBeDefined();
    });

    it("should have audit log keys in both languages", () => {
      expect(en.settings.auditLog).toBeDefined();
      expect(vi.settings.auditLog).toBeDefined();
    });
  });

  describe("sidebar consolidation", () => {
    const sidebar = readFile("src/components/layout/sidebar.tsx");

    it("should not have separate integrations nav item", () => {
      expect(sidebar).not.toContain('"integrations"');
    });

    it("should not have separate chatAdmin nav item", () => {
      expect(sidebar).not.toContain('"chatAdmin"');
    });
  });
});
