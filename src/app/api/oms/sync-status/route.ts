import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { testOmsConnection } from "@/lib/oms/client";

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
      p_permission_slug: "integrations.view",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data: storeStats } = await supabase
    .from("stores")
    .select("oms_store_id, last_synced_at")
    .not("oms_store_id", "is", null);

  const { count: totalStores } = await supabase
    .from("stores")
    .select("id", { count: "exact", head: true });

  const { count: omsCustomerCount } = await supabase
    .from("individual_customers")
    .select("id", { count: "exact", head: true })
    .not("oms_customer_id", "is", null)
    .is("deleted_at", null);

  const omsStores = storeStats ?? [];
  const lastSyncTimes = omsStores
    .map((s) => s.last_synced_at)
    .filter(Boolean) as string[];
  const lastStoreSyncAt = lastSyncTimes.length > 0
    ? lastSyncTimes.sort().reverse()[0]
    : null;

  const connectionStatus = await testOmsConnection();

  return NextResponse.json({
    lastStoreSyncAt,
    omsStoreCount: omsStores.length,
    totalStores: totalStores ?? 0,
    omsCustomerCount: omsCustomerCount ?? 0,
    connectionStatus,
  });
}
