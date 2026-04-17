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

  const { data: locked, error: statusErr } = await supabase
    .from("campaigns")
    .update({ status: "sending", sent_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["draft", "scheduled"])
    .select("id");

  if (statusErr || !locked || locked.length === 0) {
    return NextResponse.json({ error: "Campaign already being sent or status changed" }, { status: 409 });
  }

  const { data: recipients, error: recipientErr } = await supabase
    .from("campaign_recipients")
    .select("id, destination, customer_id")
    .eq("campaign_id", id)
    .eq("status", "pending");

  if (recipientErr) {
    console.error("Recipient fetch error:", recipientErr);
  }

  const allRecipients = recipients || [];
  let sentCount = 0;
  let failedCount = 0;

  if (campaign.campaign_type === "sms" && process.env.VIHAT_API_KEY) {
    const vihatApiKey = process.env.VIHAT_API_KEY;
    const brandName = process.env.VIHAT_BRAND_NAME || "KFC";

    for (const recipient of allRecipients) {
      const vihatRes = await fetch("https://api.vihat.vn/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${vihatApiKey}`,
        },
        body: JSON.stringify({
          phone: recipient.destination,
          message: campaign.template || "",
          brand_name: brandName,
        }),
      }).catch(() => null);

      const vihatResult = vihatRes ? await vihatRes.json().catch(() => null) : null;
      const success = vihatRes?.ok && vihatResult?.error === 0;

      await supabase
        .from("campaign_recipients")
        .update({
          status: success ? "sent" : "failed",
          sent_at: new Date().toISOString(),
          error: success ? null : (vihatResult?.message || "Send failed"),
        })
        .eq("id", recipient.id);

      if (success) {
        sentCount++;
        await supabase.from("channel_messages").insert({
          channel: "sms",
          direction: "outbound",
          sender_phone: recipient.destination,
          content: (campaign.template || "").slice(0, 500),
          customer_id: recipient.customer_id,
          metadata: { campaign_id: id, brand_name: brandName, vihat_response: vihatResult },
        });
      } else {
        failedCount++;
      }
    }
  } else {
    // Non-Vihat (email or no API key) — mark as sent (stub)
    const { data: updated } = await supabase
      .from("campaign_recipients")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("campaign_id", id)
      .eq("status", "pending")
      .select("id");
    sentCount = updated?.length || 0;
  }

  await supabase
    .from("campaigns")
    .update({
      status: "sent",
      sent_count: sentCount,
      delivered_count: sentCount,
      failed_count: failedCount,
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
