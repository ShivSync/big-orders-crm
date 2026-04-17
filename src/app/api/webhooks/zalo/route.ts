import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import crypto from "crypto";

function verifyZaloSignature(body: string, signature: string): boolean {
  const secret = process.env.ZALO_OA_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!checkRateLimit(`zalo-webhook:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-zalo-signature") || "";

  if (!verifyZaloSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = payload.event_name as string;
  if (eventName !== "user_send_text" && eventName !== "user_send_image") {
    return NextResponse.json({ ok: true });
  }

  const message = payload.message as Record<string, unknown> | undefined;
  const sender = payload.sender as Record<string, unknown> | undefined;
  if (!message || !sender) {
    return NextResponse.json({ error: "Missing message or sender" }, { status: 400 });
  }

  const senderId = String(sender.id || "");
  const senderName = String(message.text ? "" : "");
  const content = String(message.text || "[media]");

  const supabase = await createServiceClient();

  const { data: matchedLead } = await supabase
    .from("leads")
    .select("id")
    .eq("metadata->>zalo_id", senderId)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  const { data: matchedCustomer } = !matchedLead
    ? await supabase
        .from("individual_customers")
        .select("id")
        .eq("metadata->>zalo_id", senderId)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle()
    : { data: null };

  const { error: insertError } = await supabase.from("channel_messages").insert({
    channel: "zalo",
    direction: "inbound",
    sender_id: senderId,
    sender_name: senderName || null,
    content,
    lead_id: matchedLead?.id || null,
    customer_id: matchedCustomer?.id || null,
    metadata: { event_name: eventName, raw_message_id: message.msg_id },
  });

  if (insertError) {
    return NextResponse.json({ error: "Failed to store message" }, { status: 500 });
  }

  if (!matchedLead && !matchedCustomer) {
    await supabase.from("leads").insert({
      full_name: senderName || `Zalo User ${senderId.slice(-6)}`,
      lead_type: "individual",
      lead_source: "zalo",
      stage: "new",
      metadata: { zalo_id: senderId },
    });
  } else {
    const entityType = matchedLead ? "lead" : "customer";
    const entityId = matchedLead?.id || matchedCustomer?.id;
    await supabase.from("activities").insert({
      entity_type: entityType,
      entity_id: entityId,
      activity_type: "sms",
      subject: `Zalo message received`,
      description: content.slice(0, 500),
    });
  }

  return NextResponse.json({ ok: true });
}
