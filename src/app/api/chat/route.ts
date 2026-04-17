import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!checkRateLimit(`chat:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.action) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  switch (body.action) {
    case "start": {
      if (!checkRateLimit(`chat-start:${ip}`, 3, 60_000)) {
        return NextResponse.json({ error: "Too many sessions" }, { status: 429 });
      }

      const { data: session, error } = await supabase
        .from("chat_sessions")
        .insert({ status: "active" })
        .select("id, visitor_id")
        .single();

      if (error) {
        return NextResponse.json({ error: "Failed to start chat" }, { status: 500 });
      }

      await supabase.from("chat_messages").insert({
        session_id: session.id,
        sender_type: "bot",
        content: "greeting",
        metadata: { step: "greeting" },
      });

      return NextResponse.json({ session_id: session.id, visitor_id: session.visitor_id });
    }

    case "message": {
      if (!body.session_id || !body.content || !body.visitor_id) {
        return NextResponse.json({ error: "session_id, visitor_id, and content required" }, { status: 400 });
      }

      const { data: session } = await supabase
        .from("chat_sessions")
        .select("visitor_id, status")
        .eq("id", body.session_id)
        .single();

      if (!session || session.visitor_id !== body.visitor_id) {
        return NextResponse.json({ error: "Invalid session" }, { status: 403 });
      }

      if (session.status === "closed") {
        return NextResponse.json({ error: "Session closed" }, { status: 400 });
      }

      const safeContent = String(body.content).slice(0, 2000);

      await supabase.from("chat_messages").insert({
        session_id: body.session_id,
        sender_type: "visitor",
        content: safeContent,
      });

      const botReply = await getBotReply(supabase, body.session_id, safeContent, body.step);

      if (botReply) {
        await supabase.from("chat_messages").insert({
          session_id: body.session_id,
          sender_type: "bot",
          content: botReply.content,
          metadata: botReply.metadata,
        });
      }

      return NextResponse.json({ reply: botReply });
    }

    case "escalate": {
      if (!body.session_id || !body.visitor_id) {
        return NextResponse.json({ error: "session_id and visitor_id required" }, { status: 400 });
      }

      const { data: session } = await supabase
        .from("chat_sessions")
        .select("visitor_id")
        .eq("id", body.session_id)
        .single();

      if (!session || session.visitor_id !== body.visitor_id) {
        return NextResponse.json({ error: "Invalid session" }, { status: 403 });
      }

      await supabase
        .from("chat_sessions")
        .update({ status: "escalated" })
        .eq("id", body.session_id);

      await supabase.from("chat_messages").insert({
        session_id: body.session_id,
        sender_type: "bot",
        content: "escalated",
        metadata: { step: "escalated" },
      });

      return NextResponse.json({ escalated: true });
    }

    case "create_lead": {
      if (!body.session_id || !body.visitor_id || !body.name || !body.phone) {
        return NextResponse.json({ error: "session_id, visitor_id, name, phone required" }, { status: 400 });
      }

      const { data: session } = await supabase
        .from("chat_sessions")
        .select("visitor_id, lead_id")
        .eq("id", body.session_id)
        .single();

      if (!session || session.visitor_id !== body.visitor_id) {
        return NextResponse.json({ error: "Invalid session" }, { status: 403 });
      }

      if (session.lead_id) {
        return NextResponse.json({ error: "Lead already created for this session" }, { status: 409 });
      }

      const safeName = String(body.name).replace(/<[^>]*>/g, "").trim().slice(0, 200);
      const safePhone = String(body.phone).replace(/[^0-9+\-() ]/g, "").slice(0, 20);

      if (!safeName || safeName.length < 2 || !safePhone || safePhone.length < 8) {
        return NextResponse.json({ error: "Invalid name or phone" }, { status: 400 });
      }

      const { data: lead, error } = await supabase
        .from("leads")
        .insert({
          full_name: safeName,
          phone: safePhone,
          lead_source: "chat_bot",
          stage: "new",
          notes: [
            body.event_type ? `Event: ${String(body.event_type).slice(0, 50)}` : null,
            body.guest_count ? `Guests: ${String(body.guest_count).slice(0, 10)}` : null,
          ].filter(Boolean).join(" | "),
          metadata: {
            source_page: "chat",
            chat_session_id: body.session_id,
            event_type: typeof body.event_type === "string" ? body.event_type.slice(0, 50) : null,
            guest_count: Number(body.guest_count) || null,
          },
        })
        .select("id")
        .single();

      if (error) {
        return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
      }

      await supabase
        .from("chat_sessions")
        .update({ lead_id: lead.id, visitor_name: safeName, visitor_phone: safePhone })
        .eq("id", body.session_id);

      return NextResponse.json({ lead_id: lead.id });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getBotReply(supabase: any, sessionId: string, content: string, step?: string) {
  if (step === "ask_event_type") {
    return { content: "ask_guest_count", metadata: { step: "ask_guest_count" } };
  }
  if (step === "ask_guest_count") {
    return { content: "ask_contact", metadata: { step: "ask_contact" } };
  }
  if (step === "ask_contact") {
    return { content: "thank_you", metadata: { step: "thank_you" } };
  }

  const { data: faqs } = await supabase
    .from("bot_faq")
    .select("answer_vi, answer_en, keywords")
    .eq("active", true);

  if (faqs) {
    const lower = content.toLowerCase();
    for (const faq of faqs) {
      const matched = (faq.keywords || []).some((kw: string) => lower.includes(kw.toLowerCase()));
      if (matched) {
        return { content: faq.answer_vi, metadata: { step: "faq", faq_answer_en: faq.answer_en } };
      }
    }
  }

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("metadata")
    .eq("session_id", sessionId)
    .eq("sender_type", "bot")
    .contains("metadata", { step: "faq_not_found" });

  if (messages && messages.length >= 1) {
    await supabase
      .from("chat_sessions")
      .update({ status: "escalated" })
      .eq("id", sessionId);

    return { content: "escalated", metadata: { step: "escalated" } };
  }

  return { content: "faq_not_found", metadata: { step: "faq_not_found" } };
}
