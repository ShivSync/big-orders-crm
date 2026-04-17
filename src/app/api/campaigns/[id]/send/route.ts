import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
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
      p_permission_slug: "campaigns.send",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data: campaign, error: fetchErr } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (fetchErr || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (campaign.status !== "draft" && campaign.status !== "scheduled") {
    return NextResponse.json({ error: "Campaign cannot be sent in current status" }, { status: 400 });
  }

  const { data: existingRecipients } = await supabase
    .from("campaign_recipients")
    .select("id")
    .eq("campaign_id", id)
    .limit(1);

  if (!existingRecipients || existingRecipients.length === 0) {
    return NextResponse.json({ error: "No recipients calculated. Calculate segment first." }, { status: 400 });
  }

  const { error: statusErr } = await supabase
    .from("campaigns")
    .update({ status: "sending", sent_at: new Date().toISOString() })
    .eq("id", id);

  if (statusErr) {
    console.error("Campaign status update error:", statusErr);
    return NextResponse.json({ error: "Failed to update campaign status" }, { status: 500 });
  }

  // Mark all pending recipients as sent (stub — real integration in Sprint 9)
  const { data: updatedRecipients, error: recipientErr } = await supabase
    .from("campaign_recipients")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("campaign_id", id)
    .eq("status", "pending")
    .select("id");

  if (recipientErr) {
    console.error("Recipient update error:", recipientErr);
  }

  const sentCount = updatedRecipients?.length || 0;

  await supabase
    .from("campaigns")
    .update({
      status: "sent",
      sent_count: sentCount,
      delivered_count: sentCount,
    })
    .eq("id", id);

  await supabase.from("activities").insert({
    entity_type: "campaign",
    entity_id: id,
    activity_type: "system",
    subject: "Campaign sent",
    description: `Campaign sent to ${sentCount} recipients`,
    created_by: user.id,
  });

  return NextResponse.json({
    success: true,
    sent_count: sentCount,
  });
}
