import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("landing_page_content")
    .select("*")
    .order("sort_order");

  if (error) {
    return NextResponse.json({ error: "Failed to load content" }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: hasPerm } = await supabase.rpc("user_has_permission", {
    p_user_id: user.id,
    p_permission_slug: "landing.edit",
  });
  if (!hasPerm) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.id || !body.content) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { error } = await supabase
    .from("landing_page_content")
    .update({
      content: body.content,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
