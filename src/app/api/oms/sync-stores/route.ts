import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { fetchOmsStores } from "@/lib/oms/client";
import type { OmsSyncResult } from "@/lib/oms/types";

export async function POST() {
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
      p_permission_slug: "integrations.manage",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const serviceClient = await createServiceClient();
  const result: OmsSyncResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  try {
    const omsStores = await fetchOmsStores();

    for (const oms of omsStores) {
      const { data: existing } = await serviceClient
        .from("stores")
        .select("id, aloha_id")
        .eq("aloha_id", oms.storeAlohaId)
        .limit(1)
        .single();

      if (existing) {
        const { error } = await serviceClient
          .from("stores")
          .update({
            name: oms.storeName,
            address: oms.storeAddress,
            region: oms.region,
            active: oms.active,
            oms_store_id: oms.storeId,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) {
          result.errors.push(`Update ${oms.storeAlohaId}: ${error.message}`);
        } else {
          result.updated++;
        }
      } else {
        const { error } = await serviceClient
          .from("stores")
          .insert({
            name: oms.storeName,
            aloha_id: oms.storeAlohaId,
            address: oms.storeAddress,
            region: oms.region,
            active: oms.active,
            oms_store_id: oms.storeId,
            territory_radius_km: 5,
          });

        if (error) {
          result.errors.push(`Insert ${oms.storeAlohaId}: ${error.message}`);
        } else {
          result.created++;
        }
      }
    }

    await serviceClient.from("audit_logs").insert({
      user_id: user.id,
      action: "oms_store_sync",
      entity_type: "store",
      new_data: { created: result.created, updated: result.updated, skipped: result.skipped, errors: result.errors },
    });
  } catch (e) {
    try {
      await serviceClient.from("audit_logs").insert({
        user_id: user.id,
        action: "oms_store_sync_failed",
        entity_type: "store",
        new_data: { error: (e as Error).message },
      });
    } catch { /* best-effort audit */ }
    return NextResponse.json({ error: "Store sync failed" }, { status: 500 });
  }

  return NextResponse.json(result);
}
