import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const PHONE_RE = /^[0-9+\-() ]{8,20}$/;
const ALLOWED_ORIGINS = process.env.EMBED_ALLOWED_ORIGINS?.split(",") || ["*"];

function corsHeaders(origin: string | null) {
  const allowed = ALLOWED_ORIGINS.includes("*") || (origin && ALLOWED_ORIGINS.includes(origin));
  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(null, { headers: corsHeaders(request.headers.get("origin")) });
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"));
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

  const supabase = await createServiceClient();

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      company_name: name.trim(),
      phone: phone.trim(),
      lead_source: "embed_widget",
      stage: "new",
      notes: [
        event_type ? `Event: ${event_type}` : null,
        guest_count ? `Guests: ${guest_count}` : null,
        notes ? `Notes: ${notes}` : null,
      ].filter(Boolean).join(" | "),
      metadata: {
        source_page: "embed",
        event_type: event_type || null,
        guest_count: Number(guest_count) || null,
        referrer: referrer || null,
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
