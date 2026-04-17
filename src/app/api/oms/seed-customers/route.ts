import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { fetchOmsBigOrderCustomers, normalizePhone, mapOmsCustomerType } from "@/lib/oms/client";
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
  const seenPhones = new Set<string>();

  try {
    const omsCustomers = await fetchOmsBigOrderCustomers();

    for (const oms of omsCustomers) {
      const phone = oms.purchaserPhone || oms.recipientPhone;
      if (!phone) {
        result.skipped++;
        continue;
      }

      const normalized = normalizePhone(phone);
      if (seenPhones.has(normalized)) {
        result.skipped++;
        continue;
      }
      seenPhones.add(normalized);

      const { data: existing } = await serviceClient
        .from("individual_customers")
        .select("id, oms_customer_id")
        .eq("phone", normalized)
        .is("deleted_at", null)
        .limit(1)
        .single();

      if (existing) {
        if (!existing.oms_customer_id) {
          await serviceClient
            .from("individual_customers")
            .update({ oms_customer_id: oms.id })
            .eq("id", existing.id);
          result.updated++;
        } else {
          result.skipped++;
        }
        continue;
      }

      let storeId: string | null = null;
      if (oms.storeAlohaId) {
        const { data: store } = await serviceClient
          .from("stores")
          .select("id")
          .eq("aloha_id", oms.storeAlohaId)
          .limit(1)
          .single();
        storeId = store?.id ?? null;
      }

      const { error } = await serviceClient
        .from("individual_customers")
        .insert({
          full_name: oms.purchaserName || oms.recipientName || "Unknown",
          phone: normalized,
          email: oms.email,
          contact_type: mapOmsCustomerType(oms.customerType),
          address: oms.fullAddress,
          city: oms.city,
          district: oms.district,
          ward: oms.ward,
          store_id: storeId,
          oms_customer_id: oms.id,
          total_revenue: 0,
          order_count: 0,
          tags: [],
          metadata: { imported_from: "oms", oms_customer_type: oms.customerType },
        });

      if (error) {
        result.errors.push(`Insert ${normalized}: ${error.message}`);
      } else {
        result.created++;
      }
    }

    await serviceClient.from("audit_logs").insert({
      user_id: user.id,
      action: "oms_customer_seed",
      entity_type: "individual_customer",
      new_data: { created: result.created, updated: result.updated, skipped: result.skipped },
    });
  } catch (e) {
    try {
      await serviceClient.from("audit_logs").insert({
        user_id: user.id,
        action: "oms_customer_seed_failed",
        entity_type: "individual_customer",
        new_data: { error: (e as Error).message },
      });
    } catch { /* best-effort audit */ }
    return NextResponse.json({ error: "Customer import failed" }, { status: 500 });
  }

  return NextResponse.json(result);
}
