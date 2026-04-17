import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const PHONE_RE = /^[0-9+\-() ]{8,20}$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { name, phone, event_type, guest_count, preferred_date, notes, store_id } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Name is required (min 2 chars)" }, { status: 400 });
  }
  if (!phone || typeof phone !== "string" || !PHONE_RE.test(phone)) {
    return NextResponse.json({ error: "Valid phone number is required" }, { status: 400 });
  }

  const guestNum = Number(guest_count);
  if (guest_count && (isNaN(guestNum) || guestNum < 1 || guestNum > 10000)) {
    return NextResponse.json({ error: "Invalid guest count" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      company_name: name.trim(),
      phone: phone.trim(),
      lead_source: "web_app",
      stage: "new",
      notes: [
        event_type ? `Event: ${event_type}` : null,
        guestNum ? `Guests: ${guestNum}` : null,
        preferred_date ? `Date: ${preferred_date}` : null,
        notes ? `Notes: ${notes}` : null,
      ].filter(Boolean).join(" | "),
      metadata: {
        source_page: "book-party",
        event_type: event_type || null,
        guest_count: guestNum || null,
        preferred_date: preferred_date || null,
        store_id: store_id || null,
      },
    })
    .select("id")
    .single();

  if (error) {
    console.error("Lead creation error:", error);
    return NextResponse.json({ error: "Failed to create booking request" }, { status: 500 });
  }

  return NextResponse.json({ success: true, lead_id: lead.id });
}
