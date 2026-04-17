import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_PAYMENT_STATUSES = ["unpaid", "partial", "paid"] as const;

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
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("id")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (fetchErr || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};

  if (body.payment_status !== undefined) {
    if (!VALID_PAYMENT_STATUSES.includes(body.payment_status)) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    }
    updateData.payment_status = body.payment_status;
  }

  if (body.aloha_bill_id !== undefined) {
    updateData.aloha_bill_id = body.aloha_bill_id?.trim() || null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { error: updateErr } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", id)
    .is("deleted_at", null);

  if (updateErr) {
    console.error("Order update error:", updateErr);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
