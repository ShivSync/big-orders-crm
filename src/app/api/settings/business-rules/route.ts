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

  const isRoot = currentUser?.is_root === true;

  if (!isRoot) {
    const { data: hasPerm } = await supabase.rpc("user_has_permission", {
      p_user_id: user.id,
      p_permission_slug: "settings.view",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data: rules, error } = await supabase
    .from("business_rules")
    .select("id, rule_type, rule_key, rule_value, applies_to_role, approval_role, name_en, name_vi, active")
    .order("rule_type");

  if (error) {
    return NextResponse.json({ error: "Failed to load rules" }, { status: 500 });
  }

  return NextResponse.json({ data: rules, isAdmin: isRoot });
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.id || !body?.rule_value || typeof body.rule_value !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: existingRule } = await supabase
    .from("business_rules")
    .select("rule_type")
    .eq("id", body.id)
    .single();

  if (!existingRule) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  const rv = body.rule_value;
  if (existingRule.rule_type === "approval_threshold") {
    if (typeof rv.threshold_vnd !== "number" || rv.threshold_vnd < 0 || rv.threshold_vnd > 10_000_000_000) {
      return NextResponse.json({ error: "threshold_vnd must be a number between 0 and 10,000,000,000" }, { status: 400 });
    }
  } else if (existingRule.rule_type === "discount_limit") {
    if (typeof rv.max_pct !== "number" || rv.max_pct < 0 || rv.max_pct > 100) {
      return NextResponse.json({ error: "max_pct must be a number between 0 and 100" }, { status: 400 });
    }
  }

  const { error } = await supabase
    .from("business_rules")
    .update({ rule_value: body.rule_value })
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
