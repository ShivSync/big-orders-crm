import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_TYPES = ["sms", "email"] as const;
const VALID_STATUSES = ["draft", "scheduled", "sending", "sent", "cancelled"] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*, creator:users!campaigns_created_by_fkey(id, name, email)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json({ data: campaign });
}

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
      p_permission_slug: "campaigns.edit",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { data: campaign, error: fetchErr } = await supabase
    .from("campaigns")
    .select("id, status")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (fetchErr || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (campaign.status !== "draft") {
    return NextResponse.json({ error: "Only draft campaigns can be edited" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
    }
    updateData.name = body.name.trim();
  }
  if (body.campaign_type !== undefined) {
    if (!VALID_TYPES.includes(body.campaign_type)) {
      return NextResponse.json({ error: "Invalid campaign type" }, { status: 400 });
    }
    updateData.campaign_type = body.campaign_type;
  }
  if (body.subject !== undefined) {
    updateData.subject = body.subject?.trim() || null;
  }
  if (body.template !== undefined) {
    updateData.template = body.template?.trim() || null;
  }
  if (body.segment_filters !== undefined) {
    updateData.segment_filters = body.segment_filters;
  }
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (body.status === "cancelled") {
      updateData.status = "cancelled";
    } else if (body.status === "scheduled") {
      if (!body.scheduled_at) {
        return NextResponse.json({ error: "Scheduled time is required" }, { status: 400 });
      }
      const scheduledAt = new Date(body.scheduled_at);
      if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
        return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });
      }
      updateData.status = "scheduled";
      updateData.scheduled_at = body.scheduled_at;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { error: updateErr } = await supabase
    .from("campaigns")
    .update(updateData)
    .eq("id", id)
    .is("deleted_at", null);

  if (updateErr) {
    console.error("Campaign update error:", updateErr);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
