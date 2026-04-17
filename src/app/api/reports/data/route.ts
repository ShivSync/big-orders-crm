import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!checkRateLimit(`reports-data:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { data: currentUser } = await supabase
    .from("users")
    .select("is_root")
    .eq("id", user.id)
    .single();

  if (!currentUser?.is_root) {
    const { data: hasPerm } = await supabase.rpc("user_has_permission", {
      p_user_id: user.id,
      p_permission_slug: "reports.view",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const url = new URL(request.url);
  const storeId = url.searchParams.get("store_id");
  const region = url.searchParams.get("region");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const defaultTo = now.toISOString();
  const dateFrom = from || defaultFrom;
  const dateTo = to || defaultTo;

  let leadQuery = supabase.from("leads").select("stage, lead_source, store_id, created_at").is("deleted_at", null).gte("created_at", dateFrom).lte("created_at", dateTo);
  let orderQuery = supabase.from("orders").select("status, total_value, store_id, created_at, source").is("deleted_at", null).gte("created_at", dateFrom).lte("created_at", dateTo);
  let oppQuery = supabase.from("opportunities").select("stage, expected_value, actual_value, created_at").is("deleted_at", null).gte("created_at", dateFrom).lte("created_at", dateTo);

  if (storeId) {
    leadQuery = leadQuery.eq("store_id", storeId);
    orderQuery = orderQuery.eq("store_id", storeId);
  }
  if (region) {
    const { data: regionStores } = await supabase.from("stores").select("id").eq("region", region);
    const storeIds = (regionStores ?? []).map(s => s.id);
    if (storeIds.length > 0) {
      leadQuery = leadQuery.in("store_id", storeIds);
      orderQuery = orderQuery.in("store_id", storeIds);
    }
  }

  const [{ data: leads }, { data: orders }, { data: opportunities }] = await Promise.all([
    leadQuery,
    orderQuery,
    oppQuery,
  ]);

  const allLeads = leads ?? [];
  const allOrders = orders ?? [];
  const allOpps = opportunities ?? [];

  const pipelineFunnel = ["new", "contacted", "qualified", "converted", "lost"].map(stage => ({
    stage,
    count: allLeads.filter(l => l.stage === stage).length,
  }));

  const storeRevenue: Record<string, number> = {};
  for (const o of allOrders) {
    if (o.status === "fulfilled") {
      storeRevenue[o.store_id] = (storeRevenue[o.store_id] || 0) + (o.total_value || 0);
    }
  }
  const { data: storeNames } = await supabase.from("stores").select("id, name");
  const storeMap = Object.fromEntries((storeNames ?? []).map(s => [s.id, s.name]));
  const revenueByStore = Object.entries(storeRevenue)
    .map(([id, revenue]) => ({ store: storeMap[id] || id, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const sourceRevenue: Record<string, number> = {};
  for (const o of allOrders) {
    if (o.status === "fulfilled") {
      sourceRevenue[o.source || "unknown"] = (sourceRevenue[o.source || "unknown"] || 0) + (o.total_value || 0);
    }
  }
  const revenueBySource = Object.entries(sourceRevenue).map(([source, revenue]) => ({ source, revenue }));

  const monthlyData: Record<string, { leads: number; orders: number; revenue: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyData[key] = { leads: 0, orders: 0, revenue: 0 };
  }
  for (const l of allLeads) {
    const key = l.created_at?.slice(0, 7);
    if (key && monthlyData[key]) monthlyData[key].leads++;
  }
  for (const o of allOrders) {
    const key = o.created_at?.slice(0, 7);
    if (key && monthlyData[key]) {
      if (o.status === "fulfilled") {
        monthlyData[key].orders++;
        monthlyData[key].revenue += o.total_value || 0;
      }
    }
  }
  const monthlyTrend = Object.entries(monthlyData).map(([month, data]) => ({ month, ...data }));

  const orderStatusDist = ["draft", "confirmed", "preparing", "ready", "fulfilled", "cancelled"].map(status => ({
    status,
    count: allOrders.filter(o => o.status === status).length,
  }));

  const totalLeads = allLeads.length;
  const convertedLeads = allLeads.filter(l => l.stage === "converted").length;
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  const wonOpps = allOpps.filter(o => o.stage === "won");
  const wonValue = wonOpps.reduce((s, o) => s + (o.actual_value || 0), 0);
  const totalPipelineValue = allOpps.filter(o => !["won", "lost"].includes(o.stage)).reduce((s, o) => s + (o.expected_value || 0), 0);

  return NextResponse.json({
    pipelineFunnel,
    revenueByStore,
    revenueBySource,
    monthlyTrend,
    orderStatusDist,
    conversionRate,
    wonValue,
    totalPipelineValue,
    topStores: revenueByStore,
    summary: {
      totalLeads,
      convertedLeads,
      totalOrders: allOrders.length,
      fulfilledOrders: allOrders.filter(o => o.status === "fulfilled").length,
      totalRevenue: allOrders.filter(o => o.status === "fulfilled").reduce((s, o) => s + (o.total_value || 0), 0),
    },
  });
}
