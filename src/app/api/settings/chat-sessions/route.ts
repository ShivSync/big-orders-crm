import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: hasPerm } = await supabase.rpc("user_has_permission", {
    p_user_id: user.id,
    p_permission_slug: "chat.view",
  });
  if (!hasPerm) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, visitor_name, visitor_phone, status, created_at, lead_id")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });

  return NextResponse.json({ data });
}
