import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_EVENT_TYPES = ["birthday", "company_anniversary", "children_day", "custom"] as const;

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
      p_permission_slug: "events.create",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.customer_id) {
    return NextResponse.json({ error: "Customer is required" }, { status: 400 });
  }
  if (!body.event_name?.trim()) {
    return NextResponse.json({ error: "Event name is required" }, { status: 400 });
  }
  if (!body.event_date) {
    return NextResponse.json({ error: "Event date is required" }, { status: 400 });
  }
  if (body.event_type && !VALID_EVENT_TYPES.includes(body.event_type)) {
    return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
  }

  const { data: customer } = await supabase
    .from("individual_customers")
    .select("id")
    .eq("id", body.customer_id)
    .is("deleted_at", null)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 400 });
  }

  const reminderDays = Math.max(1, Math.min(365, Math.floor(Number(body.reminder_days_before) || 30)));

  const { data: event, error } = await supabase
    .from("recurring_events")
    .insert({
      customer_id: body.customer_id,
      event_type: body.event_type || "custom",
      event_name: body.event_name.trim(),
      event_date: body.event_date,
      reminder_days_before: reminderDays,
    })
    .select()
    .single();

  if (error) {
    console.error("Recurring event create error:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }

  return NextResponse.json({ data: event }, { status: 201 });
}
