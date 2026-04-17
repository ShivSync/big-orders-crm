import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
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
      p_permission_slug: "campaigns.view",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { channel, filters } = body;
  if (!channel || !["sms", "email"].includes(channel)) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  let query = supabase
    .from("individual_customers")
    .select("id, full_name, contact_type, city, store_id, total_revenue, last_order_date")
    .is("deleted_at", null);

  if (channel === "email") {
    query = query.not("email", "is", null);
  } else {
    query = query.not("phone", "is", null);
  }

  if (filters) {
    if (filters.customer_type?.length > 0) {
      query = query.in("contact_type", filters.customer_type);
    }
    if (filters.city?.length > 0) {
      query = query.in("city", filters.city);
    }
    if (filters.store_id?.length > 0) {
      query = query.in("store_id", filters.store_id);
    }
    if (filters.min_revenue !== undefined && filters.min_revenue !== null) {
      query = query.gte("total_revenue", filters.min_revenue);
    }
    if (filters.max_revenue !== undefined && filters.max_revenue !== null) {
      query = query.lte("total_revenue", filters.max_revenue);
    }
    if (filters.last_order_before) {
      query = query.lt("last_order_date", filters.last_order_before);
    }
    if (filters.last_order_after) {
      query = query.gt("last_order_date", filters.last_order_after);
    }
  }

  const { data: customers, error } = await query.order("full_name").limit(1000);

  if (error) {
    console.error("Segment query error:", error);
    return NextResponse.json({ error: "Failed to calculate segment" }, { status: 500 });
  }

  return NextResponse.json({
    data: customers || [],
    count: customers?.length || 0,
  });
}
