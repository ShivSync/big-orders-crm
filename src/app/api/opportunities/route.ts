import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      p_permission_slug: "pipeline.create",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  // H3: Validate referenced entities are accessible to the caller
  if (body.lead_id) {
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("id", body.lead_id)
      .is("deleted_at", null)
      .single();
    if (!lead) {
      return NextResponse.json({ error: "Referenced lead not found or not accessible" }, { status: 400 });
    }
  }

  if (body.customer_id) {
    const { data: cust } = await supabase
      .from("individual_customers")
      .select("id")
      .eq("id", body.customer_id)
      .is("deleted_at", null)
      .single();
    if (!cust) {
      return NextResponse.json({ error: "Referenced customer not found or not accessible" }, { status: 400 });
    }
  }

  if (body.assigned_to) {
    const { data: assignee } = await supabase
      .from("users")
      .select("id")
      .eq("id", body.assigned_to)
      .eq("status", "active")
      .single();
    if (!assignee) {
      return NextResponse.json({ error: "Referenced assignee not found or inactive" }, { status: 400 });
    }
  }

  const { data: opportunity, error } = await supabase
    .from("opportunities")
    .insert({
      title: body.title.trim(),
      lead_id: body.lead_id || null,
      customer_id: body.customer_id || null,
      expected_value: body.expected_value ? parseInt(String(body.expected_value), 10) : 0,
      expected_date: body.expected_date || null,
      assigned_to: body.assigned_to || null,
      notes: body.notes || null,
      stage: "new",
    })
    .select()
    .single();

  if (error) {
    console.error("Opportunity create error:", error);
    return NextResponse.json({ error: "Failed to create opportunity" }, { status: 500 });
  }

  return NextResponse.json({ data: opportunity }, { status: 201 });
}
