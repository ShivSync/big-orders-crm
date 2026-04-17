import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_EVENT_TYPES = ["birthday", "corporate", "school_event", "meeting", "custom"] as const;
const VALID_SOURCES = ["crm", "landing_page", "phone", "zalo", "facebook", "oms_migrated"] as const;
const PHONE_REGEX = /^[0-9+\s\-()]{7,20}$/;

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
      p_permission_slug: "orders.create",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.contact_name?.trim()) {
    return NextResponse.json({ error: "Contact name is required" }, { status: 400 });
  }
  if (!body.contact_phone?.trim()) {
    return NextResponse.json({ error: "Contact phone is required" }, { status: 400 });
  }
  if (!PHONE_REGEX.test(body.contact_phone.trim())) {
    return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });
  }
  if (!body.store_id) {
    return NextResponse.json({ error: "Store is required" }, { status: 400 });
  }
  if (!body.scheduled_date) {
    return NextResponse.json({ error: "Scheduled date is required" }, { status: 400 });
  }
  const scheduledDate = new Date(body.scheduled_date);
  if (isNaN(scheduledDate.getTime())) {
    return NextResponse.json({ error: "Invalid scheduled date" }, { status: 400 });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (scheduledDate < today) {
    return NextResponse.json({ error: "Scheduled date cannot be in the past" }, { status: 400 });
  }
  if (body.event_type && !VALID_EVENT_TYPES.includes(body.event_type)) {
    return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
  }
  if (body.source && !VALID_SOURCES.includes(body.source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  // Validate referenced entities
  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("id", body.store_id)
    .eq("active", true)
    .single();
  if (!store) {
    return NextResponse.json({ error: "Store not found or inactive" }, { status: 400 });
  }

  if (body.customer_id) {
    const { data: cust } = await supabase
      .from("individual_customers")
      .select("id")
      .eq("id", body.customer_id)
      .is("deleted_at", null)
      .single();
    if (!cust) {
      return NextResponse.json({ error: "Customer not found" }, { status: 400 });
    }
  }

  if (body.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", body.organization_id)
      .is("deleted_at", null)
      .single();
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 400 });
    }
  }

  if (body.opportunity_id) {
    const { data: opp } = await supabase
      .from("opportunities")
      .select("id")
      .eq("id", body.opportunity_id)
      .is("deleted_at", null)
      .single();
    if (!opp) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 400 });
    }
  }

  if (body.assigned_to) {
    const { data: assignee } = await supabase
      .from("users")
      .select("id")
      .eq("id", body.assigned_to)
      .eq("status", "active")
      .single();
    if (!assignee) {
      return NextResponse.json({ error: "Assignee not found or inactive" }, { status: 400 });
    }
  }

  // Validate and process items
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
  }

  const menuItemIds = body.items.map((i: { menu_item_id: string }) => i.menu_item_id);
  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("id, item_code, name_vi, name_en, price")
    .in("id", menuItemIds)
    .eq("active", true);

  if (!menuItems || menuItems.length !== menuItemIds.length) {
    return NextResponse.json({ error: "One or more menu items not found or inactive" }, { status: 400 });
  }

  const menuItemMap = new Map(menuItems.map(m => [m.id, m]));

  let subtotal = 0;
  const orderItems = body.items.map((item: { menu_item_id: string; quantity: number; special_requests?: string }) => {
    const mi = menuItemMap.get(item.menu_item_id)!;
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const lineTotal = mi.price * qty;
    subtotal += lineTotal;
    return {
      menu_item_id: mi.id,
      item_code: mi.item_code,
      name_vi: mi.name_vi,
      name_en: mi.name_en,
      quantity: qty,
      unit_price: mi.price,
      line_total: lineTotal,
      special_requests: item.special_requests?.trim() || null,
    };
  });

  const discountPct = Math.max(0, Math.min(100, Number(body.discount_pct) || 0));
  const discountAmount = Math.round(subtotal * discountPct / 100);
  const totalValue = subtotal - discountAmount;

  const needsApproval = discountPct > 15 || totalValue > 50000000;
  const status = body.status === "confirmed" && !needsApproval ? "confirmed" : "draft";

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      customer_id: body.customer_id || null,
      organization_id: body.organization_id || null,
      opportunity_id: body.opportunity_id || null,
      store_id: body.store_id,
      contact_name: body.contact_name.trim(),
      contact_phone: body.contact_phone.trim(),
      event_type: body.event_type || "custom",
      scheduled_date: body.scheduled_date,
      guest_count: body.guest_count ? Math.floor(Number(body.guest_count)) : null,
      subtotal,
      discount_pct: discountPct,
      discount_amount: discountAmount,
      total_value: totalValue,
      status,
      delivery_notes: body.delivery_notes?.trim() || null,
      assigned_to: body.assigned_to || null,
      source: body.source || "crm",
      notes: body.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Order create error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }

  const itemsWithOrderId = orderItems.map((item: Record<string, unknown>) => ({
    ...item,
    order_id: order.id,
  }));

  const { error: itemsErr } = await supabase
    .from("order_items")
    .insert(itemsWithOrderId);

  if (itemsErr) {
    console.error("Order items create error:", itemsErr);
    await supabase.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "Failed to create order items" }, { status: 500 });
  }

  await supabase.from("order_status_history").insert({
    order_id: order.id,
    from_status: null,
    to_status: status,
    changed_by: user.id,
    notes: "Order created",
  });

  return NextResponse.json({
    data: order,
    needs_approval: needsApproval,
  }, { status: 201 });
}
