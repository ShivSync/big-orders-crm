import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_EVENT_TYPES = ["birthday", "company_anniversary", "children_day", "custom"] as const;

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
      p_permission_slug: "events.edit",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { data: event, error: fetchErr } = await supabase
    .from("recurring_events")
    .select("id")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (fetchErr || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};

  if (body.event_name !== undefined) {
    if (!body.event_name?.trim()) {
      return NextResponse.json({ error: "Event name is required" }, { status: 400 });
    }
    updateData.event_name = body.event_name.trim();
  }
  if (body.event_type !== undefined) {
    if (!VALID_EVENT_TYPES.includes(body.event_type)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }
    updateData.event_type = body.event_type;
  }
  if (body.event_date !== undefined) {
    updateData.event_date = body.event_date;
  }
  if (body.reminder_days_before !== undefined) {
    updateData.reminder_days_before = Math.max(1, Math.min(365, Math.floor(Number(body.reminder_days_before) || 30)));
  }
  if (body.active !== undefined) {
    updateData.active = Boolean(body.active);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { error: updateErr } = await supabase
    .from("recurring_events")
    .update(updateData)
    .eq("id", id)
    .is("deleted_at", null);

  if (updateErr) {
    console.error("Recurring event update error:", updateErr);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
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
      p_permission_slug: "events.delete",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { error } = await supabase
    .from("recurring_events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) {
    console.error("Recurring event delete error:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
