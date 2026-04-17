import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_TYPES = ["sms", "email"] as const;

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
      p_permission_slug: "campaigns.create",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
  }
  if (!body.campaign_type || !VALID_TYPES.includes(body.campaign_type)) {
    return NextResponse.json({ error: "Invalid campaign type" }, { status: 400 });
  }
  if (body.campaign_type === "email" && !body.subject?.trim()) {
    return NextResponse.json({ error: "Subject is required for email campaigns" }, { status: 400 });
  }
  if (!body.template?.trim()) {
    return NextResponse.json({ error: "Template is required" }, { status: 400 });
  }

  const segmentFilters = body.segment_filters || {};

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      name: body.name.trim(),
      campaign_type: body.campaign_type,
      segment_filters: segmentFilters,
      subject: body.subject?.trim() || null,
      template: body.template.trim(),
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Campaign create error:", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }

  return NextResponse.json({ data: campaign }, { status: 201 });
}
