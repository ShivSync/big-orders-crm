import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = await createServiceClient();
  const { data: currentUser } = await svc
    .from("users")
    .select("is_root")
    .eq("id", user.id)
    .single();

  if (!currentUser?.is_root) {
    const { data: hasPerm } = await supabase.rpc("user_has_permission", {
      p_user_id: user.id,
      p_permission_slug: "settings.view",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data: settings, error } = await supabase
    .from("system_settings")
    .select("key, value, description, updated_at");

  if (error) {
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }

  const masked = (settings || []).map(s => ({
    ...s,
    value: s.value ? "••••••••••••" : "",
    configured: !!s.value,
  }));

  return NextResponse.json({ data: masked });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svcPut = await createServiceClient();
  const { data: currentUserPut } = await svcPut
    .from("users")
    .select("is_root")
    .eq("id", user.id)
    .single();

  if (!currentUserPut?.is_root) {
    const { data: hasPerm } = await supabase.rpc("user_has_permission", {
      p_user_id: user.id,
      p_permission_slug: "settings.edit",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.key || typeof body.value !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ALLOWED_KEYS = ["google_places_api_key", "apify_api_key", "firecrawl_api_key"];
  if (!ALLOWED_KEYS.includes(body.key)) {
    return NextResponse.json({ error: "Invalid setting key" }, { status: 400 });
  }

  const { error } = await supabase
    .from("system_settings")
    .update({ value: body.value.trim(), updated_at: new Date().toISOString(), updated_by: user.id })
    .eq("key", body.key);

  if (error) {
    return NextResponse.json({ error: "Failed to save setting" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
