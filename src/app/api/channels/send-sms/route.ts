import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!checkRateLimit(`send-sms:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.phone || !body?.message) {
    return NextResponse.json({ error: "Missing phone or message" }, { status: 400 });
  }

  if (typeof body.message !== "string" || body.message.length > 500) {
    return NextResponse.json({ error: "Message must be a string under 500 characters" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  const { data: hasPermission } = await supabase.rpc("user_has_permission", {
    p_user_id: user.id,
    p_permission_slug: "channels.send",
  });
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const vihatApiKey = process.env.VIHAT_API_KEY;
  const brandName = process.env.VIHAT_BRAND_NAME || "KFC";
  if (!vihatApiKey) {
    return NextResponse.json({ error: "Vihat API key not configured" }, { status: 500 });
  }

  const vihatResponse = await fetch("https://api.vihat.vn/sms/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${vihatApiKey}`,
    },
    body: JSON.stringify({
      phone: body.phone,
      message: body.message,
      brand_name: brandName,
    }),
  }).catch(() => null);

  const vihatResult = vihatResponse ? await vihatResponse.json().catch(() => null) : null;
  const success = vihatResponse?.ok && vihatResult?.error === 0;

  await supabase.from("channel_messages").insert({
    channel: "sms",
    direction: "outbound",
    sender_phone: body.phone,
    content: body.message,
    lead_id: body.lead_id || null,
    customer_id: body.customer_id || null,
    metadata: {
      brand_name: brandName,
      vihat_response: vihatResult,
      sent_by: user.id,
      campaign_id: body.campaign_id || null,
    },
  });

  if (!success) {
    return NextResponse.json({ error: "SMS send failed", details: vihatResult }, { status: 502 });
  }

  return NextResponse.json({ ok: true, vihat: vihatResult });
}
