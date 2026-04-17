import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_STATUSES = ["draft", "confirmed", "preparing", "ready", "fulfilled", "cancelled"] as const;
const VALID_PAYMENT_STATUSES = ["unpaid", "partial", "paid"] as const;

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["fulfilled", "cancelled"],
  fulfilled: [],
  cancelled: [],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
      p_permission_slug: "orders.edit",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.status) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 });
  }

  if (!VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (body.payment_status && !VALID_PAYMENT_STATUSES.includes(body.payment_status)) {
    return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
  }

  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("id, status, customer_id, total_value, discount_pct")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (fetchErr || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const allowed = VALID_TRANSITIONS[order.status];
  if (!allowed || !allowed.includes(body.status)) {
    return NextResponse.json({
      error: `Cannot transition from ${order.status} to ${body.status}`,
    }, { status: 400 });
  }

  if (body.status === "cancelled") {
    if (!body.notes?.trim()) {
      return NextResponse.json({ error: "Cancellation reason is required" }, { status: 400 });
    }
  }

  // Confirming an order requires orders.approve permission
  if (body.status === "confirmed" && !currentUser?.is_root) {
    const needsApproval = (order.discount_pct > 15) || (order.total_value > 50000000);
    if (needsApproval) {
      const { data: hasApprove } = await supabase.rpc("user_has_permission", {
        p_user_id: user.id,
        p_permission_slug: "orders.approve",
      });
      if (!hasApprove) {
        return NextResponse.json({ error: "Approval permission required for this order" }, { status: 403 });
      }
    }
  }

  const updateData: Record<string, unknown> = { status: body.status };
  if (body.status === "preparing" && body.aloha_bill_id?.trim()) {
    updateData.aloha_bill_id = body.aloha_bill_id.trim();
  }
  if (body.payment_status) {
    updateData.payment_status = body.payment_status;
  }
  if (body.status === "confirmed") {
    updateData.approved_by = user.id;
  }

  const { error: updateErr } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", id)
    .is("deleted_at", null);

  if (updateErr) {
    console.error("Order status update error:", updateErr);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }

  await supabase.from("order_status_history").insert({
    order_id: id,
    from_status: order.status,
    to_status: body.status,
    changed_by: user.id,
    notes: body.notes?.trim() || null,
  });

  if (body.status === "fulfilled" && order.customer_id) {
    const { data: customer } = await supabase
      .from("individual_customers")
      .select("total_revenue, order_count")
      .eq("id", order.customer_id)
      .single();

    if (customer) {
      await supabase
        .from("individual_customers")
        .update({
          total_revenue: (customer.total_revenue || 0) + order.total_value,
          order_count: (customer.order_count || 0) + 1,
          last_order_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", order.customer_id);
    }
  }

  await supabase.from("activities").insert({
    entity_type: "order",
    entity_id: id,
    activity_type: "system",
    subject: `Order status changed: ${order.status} → ${body.status}`,
    created_by: user.id,
  });

  return NextResponse.json({ success: true });
}
