import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("Sprint 11: Reports & Dashboard", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20260418500000_sprint11_reports_kpi.sql"),
    "utf-8"
  );

  describe("migration", () => {
    it("should create kpi_targets table", () => {
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS kpi_targets");
    });

    it("should have period and metric columns", () => {
      expect(sql).toContain("period text NOT NULL");
      expect(sql).toContain("metric text NOT NULL");
    });

    it("should have metric CHECK constraint", () => {
      expect(sql).toContain("leads_target");
      expect(sql).toContain("orders_target");
      expect(sql).toContain("revenue_target");
      expect(sql).toContain("conversion_target");
    });

    it("should have unique constraint on store_id+period+metric", () => {
      expect(sql).toContain("UNIQUE(store_id, period, metric)");
    });

    it("should enable RLS on kpi_targets", () => {
      expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    });

    it("should seed reports.view permission", () => {
      expect(sql).toContain("reports.view");
    });

    it("should seed reports.export permission", () => {
      expect(sql).toContain("reports.export");
    });

    it("should create RLS policies for select/insert/update", () => {
      expect(sql).toContain("kpi_targets_select");
      expect(sql).toContain("kpi_targets_insert");
      expect(sql).toContain("kpi_targets_update");
    });
  });

  describe("API routes", () => {
    it("should have dashboard stats route", () => {
      expect(existsSync(join(process.cwd(), "src/app/api/dashboard/stats/route.ts"))).toBe(true);
    });

    it("should have reports data route", () => {
      expect(existsSync(join(process.cwd(), "src/app/api/reports/data/route.ts"))).toBe(true);
    });

    it("should have reports export route", () => {
      expect(existsSync(join(process.cwd(), "src/app/api/reports/export/route.ts"))).toBe(true);
    });
  });

  describe("chart components", () => {
    const chartDir = join(process.cwd(), "src/components/charts");
    const charts = [
      "pipeline-funnel.tsx",
      "revenue-by-store.tsx",
      "revenue-by-source.tsx",
      "monthly-trend.tsx",
      "order-status.tsx",
      "conversion-gauge.tsx",
      "mini-pipeline-funnel.tsx",
      "mini-monthly-trend.tsx",
    ];

    charts.forEach(chart => {
      it(`should have ${chart}`, () => {
        expect(existsSync(join(chartDir, chart))).toBe(true);
      });
    });
  });

  describe("pages", () => {
    it("should have reports page", () => {
      expect(existsSync(join(process.cwd(), "src/app/[locale]/(dashboard)/reports/page.tsx"))).toBe(true);
    });

    it("should have dashboard page with charts", () => {
      const dashboard = readFileSync(
        join(process.cwd(), "src/app/[locale]/(dashboard)/dashboard/page.tsx"),
        "utf-8"
      );
      expect(dashboard).toContain("MiniPipelineFunnel");
      expect(dashboard).toContain("MiniMonthlyTrend");
      expect(dashboard).toContain("HelpTooltip");
    });
  });

  describe("i18n", () => {
    const en = JSON.parse(readFileSync(join(process.cwd(), "src/messages/en.json"), "utf-8"));
    const vi = JSON.parse(readFileSync(join(process.cwd(), "src/messages/vi.json"), "utf-8"));

    it("should have reports section in English", () => {
      expect(en.reports).toBeDefined();
      expect(en.reports.title).toBe("Reports & Analytics");
      expect(en.reports.pipelineFunnel).toBeDefined();
      expect(en.reports.exportLeads).toBeDefined();
    });

    it("should have reports section in Vietnamese", () => {
      expect(vi.reports).toBeDefined();
      expect(vi.reports.title).toBe("Báo cáo & Phân tích");
    });

    it("should have dashboard chart keys", () => {
      expect(en.dashboard.pipelineFunnel).toBeDefined();
      expect(en.dashboard.monthlyTrend).toBeDefined();
    });

    it("should have new help tooltips in English", () => {
      expect(en.help.tooltips.dashboardStats).toBeDefined();
      expect(en.help.tooltips.pipelineFunnelChart).toBeDefined();
      expect(en.help.tooltips.csvExport).toBeDefined();
      expect(en.help.tooltips.discoveryMapLegend).toBeDefined();
    });

    it("should have new help tooltips in Vietnamese", () => {
      expect(vi.help.tooltips.dashboardStats).toBeDefined();
      expect(vi.help.tooltips.pipelineFunnelChart).toBeDefined();
      expect(vi.help.tooltips.csvExport).toBeDefined();
    });

    it("should have matching report keys in both languages", () => {
      const enKeys = Object.keys(en.reports);
      const viKeys = Object.keys(vi.reports);
      enKeys.forEach(key => {
        expect(viKeys).toContain(key);
      });
    });
  });

  describe("types", () => {
    const types = readFileSync(join(process.cwd(), "src/types/database.ts"), "utf-8");

    it("should have KpiTarget interface", () => {
      expect(types).toContain("interface KpiTarget");
    });

    it("should have KpiMetric type", () => {
      expect(types).toContain("KpiMetric");
      expect(types).toContain("leads_target");
      expect(types).toContain("revenue_target");
    });
  });

  describe("discovery map", () => {
    const map = readFileSync(
      join(process.cwd(), "src/app/[locale]/(dashboard)/discovery/discovery-map.tsx"),
      "utf-8"
    );

    it("should have category-based marker colors", () => {
      expect(map).toContain("CATEGORY_MARKER_COLORS");
      expect(map).toContain("getCategoryIcon");
    });

    it("should have color entries for school, company, hotel", () => {
      expect(map).toContain('school: "blue"');
      expect(map).toContain('company: "grey"');
      expect(map).toContain('hotel: "gold"');
    });
  });

  describe("pipeline layout", () => {
    const pipeline = readFileSync(
      join(process.cwd(), "src/app/[locale]/(dashboard)/pipeline/page.tsx"),
      "utf-8"
    );

    it("should use responsive grid instead of horizontal scroll", () => {
      expect(pipeline).toContain("grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6");
      expect(pipeline).not.toContain("overflow-x-auto");
    });
  });

  describe("export API", () => {
    const exportRoute = readFileSync(
      join(process.cwd(), "src/app/api/reports/export/route.ts"),
      "utf-8"
    );

    it("should support leads, customers, orders export types", () => {
      expect(exportRoute).toContain('"leads"');
      expect(exportRoute).toContain('"customers"');
      expect(exportRoute).toContain('"orders"');
    });

    it("should log exports to audit_logs", () => {
      expect(exportRoute).toContain("audit_logs");
      expect(exportRoute).toContain("data_export");
    });

    it("should check reports.export permission", () => {
      expect(exportRoute).toContain("reports.export");
    });

    it("should return CSV with proper headers", () => {
      expect(exportRoute).toContain("text/csv");
      expect(exportRoute).toContain("Content-Disposition");
    });
  });
});
