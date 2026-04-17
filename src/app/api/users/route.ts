import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
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
      p_permission_slug: "users.create",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json();
  const { email, name, phone, roleId, region } = body;

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const serviceClient = await createServiceClient();

  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    password: "TempPass123!",
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  if (authData.user) {
    await serviceClient.from("users").insert({
      id: authData.user.id,
      email,
      name: name || null,
      phone: phone || null,
      region: region || "ALL",
      status: "active",
    });

    if (roleId) {
      await serviceClient.from("user_roles").insert({
        user_id: authData.user.id,
        role_id: roleId,
      });
    }
  }

  return NextResponse.json({ data: { id: authData.user?.id } });
}
