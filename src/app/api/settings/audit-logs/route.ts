import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const offset = Math.max(0, parseInt(params.get("offset") || "0", 10) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") || "26", 10) || 26));
  const entityType = params.get("entity_type");
  const action = params.get("action");

  const serviceClient = await createServiceClient();
  let query = serviceClient
    .from("audit_logs")
    .select("id, user_id, action, entity_type, entity_id, old_data, new_data, ip_address, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }
  if (action) {
    query = query.eq("action", action);
  }

  const { data: logs, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to load audit logs" }, { status: 500 });
  }

  const userIds = [...new Set((logs || []).map((l) => l.user_id).filter(Boolean))];
  let userMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: users } = await serviceClient
      .from("users")
      .select("id, name")
      .in("id", userIds);
    if (users) {
      userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));
    }
  }

  const enriched = (logs || []).map((log) => ({
    ...log,
    user_name: userMap[log.user_id] || null,
  }));

  return NextResponse.json({ data: enriched });
}
