import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!checkRateLimit(`send-zns:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.template_id || !body?.phone || !body?.params) {
    return NextResponse.json({ error: "Missing template_id, phone, or params" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  const { data: hasPermission } = await supabase.rpc("user_has_permission", {
    p_user_id: user.id,
    p_permission_slug: "channels.send",
  });
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 48h reply window check: verify there's a recent inbound Zalo message from this phone
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: recentInbound } = await supabase
    .from("channel_messages")
    .select("id")
    .eq("channel", "zalo")
    .eq("direction", "inbound")
    .eq("sender_phone", body.phone)
    .gte("created_at", fortyEightHoursAgo)
    .limit(1)
    .maybeSingle();

  if (!recentInbound) {
    return NextResponse.json({ error: "No inbound Zalo message within 48h — ZNS blocked by Zalo policy" }, { status: 422 });
  }

  const vihatApiKey = process.env.VIHAT_API_KEY;
  if (!vihatApiKey) {
    return NextResponse.json({ error: "Vihat API key not configured" }, { status: 500 });
  }

  // Send via Vihat ZNS API
  const vihatResponse = await fetch("https://api.vihat.vn/zns/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${vihatApiKey}`,
    },
    body: JSON.stringify({
      template_id: body.template_id,
      phone: body.phone,
      params: body.params,
    }),
  }).catch(() => null);

  const vihatResult = vihatResponse ? await vihatResponse.json().catch(() => null) : null;
  const success = vihatResponse?.ok && vihatResult?.error === 0;

  await supabase.from("channel_messages").insert({
    channel: "zalo",
    direction: "outbound",
    sender_phone: body.phone,
    content: `ZNS template: ${body.template_id}`,
    lead_id: body.lead_id || null,
    customer_id: body.customer_id || null,
    metadata: {
      template_id: body.template_id,
      params: body.params,
      vihat_response: vihatResult,
      sent_by: user.id,
    },
  });

  if (!success) {
    return NextResponse.json({ error: "ZNS send failed", details: vihatResult }, { status: 502 });
  }

  return NextResponse.json({ ok: true, vihat: vihatResult });
}
