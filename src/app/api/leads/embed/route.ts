import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const PHONE_RE = /^[0-9+\-() ]{8,20}$/;
const VALID_EVENT_TYPES = ["birthday", "corporate", "school", "wedding", "other"];
const ALLOWED_ORIGINS = process.env.EMBED_ALLOWED_ORIGINS?.split(",") || [];

function corsHeaders(origin: string | null) {
  const allowed = ALLOWED_ORIGINS.length === 0 || (origin && ALLOWED_ORIGINS.includes(origin));
  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : (ALLOWED_ORIGINS[0] || ""),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(null, { headers: corsHeaders(request.headers.get("origin")) });
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"));
  const ip = getClientIp(request.headers);
  if (!checkRateLimit(`lead-embed:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers });
  }

  const { name, phone, event_type, guest_count, notes, referrer } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Name required" }, { status: 400, headers });
  }
  if (!phone || typeof phone !== "string" || !PHONE_RE.test(phone)) {
    return NextResponse.json({ error: "Valid phone required" }, { status: 400, headers });
  }

  const safeName = name.replace(/<[^>]*>/g, "").trim().slice(0, 200);
  const safeEventType = typeof event_type === "string" && VALID_EVENT_TYPES.includes(event_type) ? event_type : null;
  const safeGuests = Number(guest_count) >= 1 && Number(guest_count) <= 10000 ? Number(guest_count) : null;
  const safeNotes = typeof notes === "string" ? notes.slice(0, 1000) : "";

  const supabase = await createServiceClient();

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      company_name: safeName,
      phone: phone.trim(),
      lead_source: "embed_widget",
      stage: "new",
      notes: [
        safeEventType ? `Event: ${safeEventType}` : null,
        safeGuests ? `Guests: ${safeGuests}` : null,
        safeNotes ? `Notes: ${safeNotes}` : null,
      ].filter(Boolean).join(" | "),
      metadata: {
        source_page: "embed",
        event_type: safeEventType,
        guest_count: safeGuests,
        referrer: typeof referrer === "string" ? referrer.slice(0, 500) : null,
      },
    })
    .select("id")
    .single();

  if (error) {
    console.error("Embed lead error:", error);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500, headers });
  }

  return NextResponse.json({ success: true, lead_id: lead.id }, { headers });
}
