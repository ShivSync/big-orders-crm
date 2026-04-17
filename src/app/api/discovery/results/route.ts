import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: currentUser } = await supabase
    .from("users")
    .select("is_root")
    .eq("id", user.id)
    .single();

  if (!currentUser?.is_root) {
    const { data: hasPerm } = await supabase.rpc("user_has_permission", {
      p_user_id: user.id,
      p_permission_slug: "discovery.view",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const storeId = request.nextUrl.searchParams.get("store_id");

  let query = supabase
    .from("leads")
    .select("id, full_name, phone, city, stage, store_id, metadata, created_at")
    .eq("lead_source", "google_maps")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  const { data: leads, error } = await query.limit(500);

  if (error) {
    return NextResponse.json({ error: "Failed to load results" }, { status: 500 });
  }

  return NextResponse.json({ data: leads || [] });
}
