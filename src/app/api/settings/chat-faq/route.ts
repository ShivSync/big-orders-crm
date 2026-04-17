import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("bot_faq")
    .select("*")
    .order("sort_order");

  if (error) return NextResponse.json({ error: "Failed to load FAQ" }, { status: 500 });

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: hasPerm } = await supabase.rpc("user_has_permission", {
    p_user_id: user.id,
    p_permission_slug: "landing.edit",
  });
  if (!hasPerm) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || !body.question_vi || !body.answer_vi) {
    return NextResponse.json({ error: "question_vi and answer_vi required" }, { status: 400 });
  }

  const { error } = await supabase.from("bot_faq").insert({
    question_vi: body.question_vi.slice(0, 500),
    question_en: (body.question_en || "").slice(0, 500),
    answer_vi: body.answer_vi.slice(0, 2000),
    answer_en: (body.answer_en || "").slice(0, 2000),
    keywords: Array.isArray(body.keywords) ? body.keywords.slice(0, 20) : [],
    category: body.category || "general",
  });

  if (error) return NextResponse.json({ error: "Failed to create FAQ" }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: hasPerm } = await supabase.rpc("user_has_permission", {
    p_user_id: user.id,
    p_permission_slug: "landing.edit",
  });
  if (!hasPerm) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || !body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await supabase.from("bot_faq").delete().eq("id", body.id);

  return NextResponse.json({ success: true });
}
