import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import crypto from "crypto";

function verifyAntbuddySignature(body: string, signature: string): boolean {
  const secret = process.env.ANTBUDDY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!checkRateLimit(`antbuddy-webhook:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-antbuddy-signature") || "";

  if (!verifyAntbuddySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const callerPhone = String(payload.caller_phone || payload.from || "").replace(/\D/g, "");
  const callerId = String(payload.call_id || "");

  if (!callerPhone || !/^\d{9,12}$/.test(callerPhone)) {
    return NextResponse.json({ error: "Missing or invalid caller phone" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  const normalizedPhone = callerPhone.startsWith("84") ? "0" + callerPhone.slice(2) : callerPhone;

  const { data: matchedLead } = await supabase
    .from("leads")
    .select("id, full_name")
    .or(`phone.eq."${normalizedPhone}",phone.eq."${callerPhone}"`)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  const { data: matchedCustomer } = !matchedLead
    ? await supabase
        .from("individual_customers")
        .select("id, full_name")
        .or(`phone.eq."${normalizedPhone}",phone.eq."${callerPhone}"`)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle()
    : { data: null };

  const senderName = matchedLead?.full_name || matchedCustomer?.full_name || null;

  await supabase.from("channel_messages").insert({
    channel: "phone",
    direction: "inbound",
    sender_id: callerId,
    sender_name: senderName,
    sender_phone: normalizedPhone,
    content: `Incoming call from ${normalizedPhone}`,
    lead_id: matchedLead?.id || null,
    customer_id: matchedCustomer?.id || null,
    metadata: { call_id: callerId, source: "antbuddy", raw_phone: callerPhone },
  });

  if (matchedLead || matchedCustomer) {
    const entityType = matchedLead ? "lead" : "customer";
    const entityId = matchedLead?.id || matchedCustomer?.id;
    await supabase.from("activities").insert({
      entity_type: entityType,
      entity_id: entityId,
      activity_type: "call",
      subject: `Incoming call (Antbuddy)`,
      description: `Caller: ${normalizedPhone}`,
    });
  } else {
    await supabase.from("leads").insert({
      full_name: `Caller ${normalizedPhone}`,
      phone: normalizedPhone,
      lead_type: "individual",
      lead_source: "phone_call",
      stage: "new",
      metadata: { antbuddy_call_id: callerId },
    });
  }

  return NextResponse.json({
    ok: true,
    matched: matchedLead ? "lead" : matchedCustomer ? "customer" : null,
    entity_id: matchedLead?.id || matchedCustomer?.id || null,
    name: senderName,
  });
}
