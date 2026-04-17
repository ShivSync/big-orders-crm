import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import crypto from "crypto";

function verifyFacebookSignature(body: string, signature: string): boolean {
  const secret = process.env.FACEBOOK_APP_SECRET;
  if (!secret) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.FACEBOOK_VERIFY_TOKEN) {
    return new Response(challenge || "", { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!checkRateLimit(`fb-webhook:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256") || "";

  if (!verifyFacebookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.object !== "page") {
    return NextResponse.json({ ok: true });
  }

  const supabase = await createServiceClient();
  const entries = (payload.entry as Array<Record<string, unknown>>) || [];

  for (const entry of entries) {
    const messaging = (entry.messaging as Array<Record<string, unknown>>) || [];

    for (const event of messaging) {
      const sender = event.sender as Record<string, string>;
      const messageData = event.message as Record<string, unknown> | undefined;
      if (!sender?.id || !messageData) continue;

      const senderId = sender.id;
      const content = String(messageData.text || "[media]");

      const { data: matchedLead } = await supabase
        .from("leads")
        .select("id")
        .eq("metadata->>facebook_id", senderId)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();

      const { data: matchedCustomer } = !matchedLead
        ? await supabase
            .from("individual_customers")
            .select("id")
            .eq("metadata->>facebook_id", senderId)
            .is("deleted_at", null)
            .limit(1)
            .maybeSingle()
        : { data: null };

      await supabase.from("channel_messages").insert({
        channel: "facebook",
        direction: "inbound",
        sender_id: senderId,
        content,
        lead_id: matchedLead?.id || null,
        customer_id: matchedCustomer?.id || null,
        metadata: { mid: messageData.mid },
      });

      if (!matchedLead && !matchedCustomer) {
        await supabase.from("leads").insert({
          full_name: `Facebook User ${senderId.slice(-6)}`,
          lead_type: "individual",
          lead_source: "facebook",
          stage: "new",
          metadata: { facebook_id: senderId },
        });
      } else {
        const entityType = matchedLead ? "lead" : "customer";
        const entityId = matchedLead?.id || matchedCustomer?.id;
        await supabase.from("activities").insert({
          entity_type: entityType,
          entity_id: entityId,
          activity_type: "sms",
          subject: "Facebook message received",
          description: content.slice(0, 500),
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
