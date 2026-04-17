import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  const [
    { count: totalLeads },
    { count: leadsThisMonth },
    { count: leadsLastMonth },
    { data: opportunities },
    { count: pendingOrders },
    { data: revenueThisMonth },
    { data: revenueLastMonth },
  ] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("leads").select("id", { count: "exact", head: true }).is("deleted_at", null).gte("created_at", startOfMonth),
    supabase.from("leads").select("id", { count: "exact", head: true }).is("deleted_at", null).gte("created_at", startOfLastMonth).lte("created_at", endOfLastMonth),
    supabase.from("opportunities").select("expected_value, stage").is("deleted_at", null).not("stage", "in", "(won,lost)"),
    supabase.from("orders").select("id", { count: "exact", head: true }).is("deleted_at", null).in("status", ["draft", "confirmed", "preparing"]),
    supabase.from("orders").select("total_value").is("deleted_at", null).eq("status", "fulfilled").gte("created_at", startOfMonth),
    supabase.from("orders").select("total_value").is("deleted_at", null).eq("status", "fulfilled").gte("created_at", startOfLastMonth).lte("created_at", endOfLastMonth),
  ]);

  const activeOpportunitiesValue = (opportunities ?? []).reduce((s, o) => s + (o.expected_value || 0), 0);
  const activeOpportunitiesCount = opportunities?.length ?? 0;
  const monthRevenue = (revenueThisMonth ?? []).reduce((s, o) => s + (o.total_value || 0), 0);
  const lastMonthRevenue = (revenueLastMonth ?? []).reduce((s, o) => s + (o.total_value || 0), 0);

  const leadsChange = (leadsLastMonth ?? 0) > 0
    ? Math.round(((leadsThisMonth ?? 0) - (leadsLastMonth ?? 0)) / (leadsLastMonth ?? 1) * 100)
    : 0;
  const revenueChange = lastMonthRevenue > 0
    ? Math.round((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100)
    : 0;

  return NextResponse.json({
    totalLeads: totalLeads ?? 0,
    leadsThisMonth: leadsThisMonth ?? 0,
    leadsChange,
    activeOpportunities: activeOpportunitiesCount,
    activeOpportunitiesValue,
    pendingOrders: pendingOrders ?? 0,
    monthlyRevenue: monthRevenue,
    revenueChange,
  });
}
