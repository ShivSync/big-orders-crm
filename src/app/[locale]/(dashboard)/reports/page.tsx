"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
type StoreOption = { id: string; name: string; region: string };
import dynamic from "next/dynamic";

const PipelineFunnel = dynamic(() => import("@/components/charts/pipeline-funnel"), { ssr: false });
const RevenueByStore = dynamic(() => import("@/components/charts/revenue-by-store"), { ssr: false });
const RevenueBySource = dynamic(() => import("@/components/charts/revenue-by-source"), { ssr: false });
const MonthlyTrend = dynamic(() => import("@/components/charts/monthly-trend"), { ssr: false });
const OrderStatusChart = dynamic(() => import("@/components/charts/order-status"), { ssr: false });
const ConversionGauge = dynamic(() => import("@/components/charts/conversion-gauge"), { ssr: false });

interface ReportData {
  pipelineFunnel: { stage: string; count: number }[];
  revenueByStore: { store: string; revenue: number }[];
  revenueBySource: { source: string; revenue: number }[];
  monthlyTrend: { month: string; leads: number; orders: number; revenue: number }[];
  orderStatusDist: { status: string; count: number }[];
  conversionRate: number;
  wonValue: number;
  totalPipelineValue: number;
  topStores: { store: string; revenue: number }[];
  summary: { totalLeads: number; convertedLeads: number; totalOrders: number; fulfilledOrders: number; totalRevenue: number };
}

function formatVnd(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ₫`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K ₫`;
  return `${value.toLocaleString()} ₫`;
}

export default function ReportsPage() {
  const t = useTranslations("reports");
  const tCommon = useTranslations("common");

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    createClient().from("stores").select("id, name, region").eq("active", true).order("name").then(({ data }) => setStores(data ?? []));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (storeId) params.set("store_id", storeId);
    if (region) params.set("region", region);
    if (dateFrom) params.set("from", new Date(dateFrom).toISOString());
    if (dateTo) params.set("to", new Date(dateTo + "T23:59:59").toISOString());
    const res = await fetch(`/api/reports/data?${params}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [storeId, region, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async (type: string) => {
    const res = await fetch(`/api/reports/export?type=${type}`);
    if (!res.ok) { toast.error(t("exportError")); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("exportSuccess"));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("leads")}>
            <Download className="h-4 w-4 mr-1" />{t("exportLeads")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("customers")}>
            <Download className="h-4 w-4 mr-1" />{t("exportCustomers")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("orders")}>
            <Download className="h-4 w-4 mr-1" />{t("exportOrders")}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <Label>{t("dateFrom")}</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>{t("dateTo")}</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div>
              <Label>{t("store")}</Label>
              <Select value={storeId} onValueChange={v => setStoreId(v === "all" ? "" : v ?? "")}>
                <SelectTrigger><SelectValue placeholder={tCommon("all")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tCommon("all")}</SelectItem>
                  {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("region")}</Label>
              <Select value={region} onValueChange={v => setRegion(v === "all" ? "" : v ?? "")}>
                <SelectTrigger><SelectValue placeholder={tCommon("all")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tCommon("all")}</SelectItem>
                  <SelectItem value="N">North</SelectItem>
                  <SelectItem value="T">Central</SelectItem>
                  <SelectItem value="B">South</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{data.summary.totalLeads}</div><div className="text-xs text-gray-500">{t("totalLeads")}</div></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{data.conversionRate}%</div><div className="text-xs text-gray-500">{t("conversionRate")}</div></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{data.summary.totalOrders}</div><div className="text-xs text-gray-500">{t("totalOrders")}</div></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{formatVnd(data.summary.totalRevenue)}</div><div className="text-xs text-gray-500">{t("totalRevenue")}</div></CardContent></Card>
            <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{formatVnd(data.totalPipelineValue)}</div><div className="text-xs text-gray-500">{t("pipelineValue")}</div></CardContent></Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2">{t("pipelineFunnel")} <HelpTooltip tooltipKey="pipelineFunnelChart" /></CardTitle></CardHeader>
              <CardContent className="h-72"><PipelineFunnel data={data.pipelineFunnel} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2">{t("monthlyTrend")} <HelpTooltip tooltipKey="monthlyTrendChart" /></CardTitle></CardHeader>
              <CardContent className="h-72"><MonthlyTrend data={data.monthlyTrend} /></CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2">{t("revenueByStore")} <HelpTooltip tooltipKey="revenueByStoreChart" /></CardTitle></CardHeader>
              <CardContent className="h-72"><RevenueByStore data={data.revenueByStore} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2">{t("revenueBySource")} <HelpTooltip tooltipKey="revenueBySourceChart" /></CardTitle></CardHeader>
              <CardContent className="h-72"><RevenueBySource data={data.revenueBySource} /></CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2">{t("orderStatus")} <HelpTooltip tooltipKey="orderStatusChart" /></CardTitle></CardHeader>
              <CardContent className="h-72"><OrderStatusChart data={data.orderStatusDist} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2">{t("conversionRate")} <HelpTooltip tooltipKey="conversionGauge" /></CardTitle></CardHeader>
              <CardContent className="h-72 flex items-center justify-center">
                <ConversionGauge rate={data.conversionRate} won={data.wonValue} pipeline={data.totalPipelineValue} />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {loading && <div className="text-center py-12 text-gray-400">{tCommon("loading")}</div>}
    </div>
  );
}
