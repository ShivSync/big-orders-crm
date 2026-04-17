import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const PHONE_RE = /^[0-9+\-() ]{8,20}$/;
const VALID_EVENT_TYPES = ["birthday", "corporate", "school", "wedding", "other"];

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!checkRateLimit(`lead-public:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

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

  const safeEventType = typeof event_type === "string" && VALID_EVENT_TYPES.includes(event_type) ? event_type : null;
  const guestNum = Number(guest_count);
  const safeGuests = !isNaN(guestNum) && guestNum >= 1 && guestNum <= 10000 ? guestNum : null;
  const safeDate = typeof preferred_date === "string" ? preferred_date.slice(0, 10) : null;
  const safeNotes = typeof notes === "string" ? notes.slice(0, 1000) : "";
  const safeName = name.replace(/<[^>]*>/g, "").trim().slice(0, 200);

  const supabase = await createServiceClient();

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      company_name: safeName,
      phone: phone.trim(),
      lead_source: "web_app",
      stage: "new",
      notes: [
        safeEventType ? `Event: ${safeEventType}` : null,
        safeGuests ? `Guests: ${safeGuests}` : null,
        safeDate ? `Date: ${safeDate}` : null,
        safeNotes ? `Notes: ${safeNotes}` : null,
      ].filter(Boolean).join(" | "),
      metadata: {
        source_page: "book-party",
        event_type: safeEventType,
        guest_count: safeGuests,
        preferred_date: safeDate,
        store_id: typeof store_id === "string" ? store_id.slice(0, 50) : null,
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
