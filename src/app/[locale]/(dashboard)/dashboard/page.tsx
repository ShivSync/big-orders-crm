"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, BarChart3, ShoppingCart, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import dynamic from "next/dynamic";

const MiniPipelineFunnel = dynamic(() => import("@/components/charts/mini-pipeline-funnel"), { ssr: false });
const MiniMonthlyTrend = dynamic(() => import("@/components/charts/mini-monthly-trend"), { ssr: false });

interface DashboardStats {
  totalLeads: number;
  leadsThisMonth: number;
  leadsChange: number;
  activeOpportunities: number;
  activeOpportunitiesValue: number;
  pendingOrders: number;
  monthlyRevenue: number;
  revenueChange: number;
}

function formatVnd(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ₫`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K ₫`;
  return `${value.toLocaleString()} ₫`;
}

function StatCard({
  title,
  value,
  icon: Icon,
  change,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  change?: number;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs mt-1 ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
            {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {change >= 0 ? "+" : ""}{change}% vs last month
          </div>
        )}
        {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reportData, setReportData] = useState<{ pipelineFunnel: { stage: string; count: number }[]; monthlyTrend: { month: string; leads: number; orders: number; revenue: number }[] } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    fetch("/api/dashboard/stats", { signal })
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(setStats)
      .catch(e => { if (e.name !== "AbortError") console.error("Dashboard stats error:", e); });
    fetch("/api/reports/data", { signal })
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(setReportData)
      .catch(e => { if (e.name !== "AbortError") console.error("Reports data error:", e); });
    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm text-gray-500">{t("title")}</span>
        <HelpTooltip tooltipKey="dashboardStats" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("totalLeads")}
          value={String(stats?.totalLeads ?? "—")}
          icon={Target}
          change={stats?.leadsChange}
        />
        <StatCard
          title={t("activeOpportunities")}
          value={String(stats?.activeOpportunities ?? "—")}
          icon={BarChart3}
          subtitle={stats ? formatVnd(stats.activeOpportunitiesValue) : undefined}
        />
        <StatCard
          title={t("pendingOrders")}
          value={String(stats?.pendingOrders ?? "—")}
          icon={ShoppingCart}
        />
        <StatCard
          title={t("monthlyRevenue")}
          value={stats ? formatVnd(stats.monthlyRevenue) : "—"}
          icon={DollarSign}
          change={stats?.revenueChange}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("pipelineFunnel")}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {reportData?.pipelineFunnel && <MiniPipelineFunnel data={reportData.pipelineFunnel} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("monthlyTrend")}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {reportData?.monthlyTrend && <MiniMonthlyTrend data={reportData.monthlyTrend} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
