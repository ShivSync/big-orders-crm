import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
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

  const serviceClient = await createServiceClient();
  const { data, error } = await serviceClient
    .from("audit_logs")
    .select("id, entity_id, new_data, created_at")
    .eq("action", "deletion_request")
    .eq("entity_type", "customer")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Failed to load deletion requests" }, { status: 500 });
  }

  const requests = (data || []).map((log) => ({
    id: log.id,
    customer_id: log.entity_id,
    customer_name: (log.new_data as Record<string, unknown>)?.customer_name || "Unknown",
    reason: (log.new_data as Record<string, unknown>)?.reason || "",
    requested_at: log.created_at,
    status: (log.new_data as Record<string, unknown>)?.status || "completed",
  }));

  return NextResponse.json({ data: requests });
}

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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.customer_id || !body?.reason) {
    return NextResponse.json({ error: "customer_id and reason are required" }, { status: 400 });
  }

  const serviceClient = await createServiceClient();

  const { data: customer } = await serviceClient
    .from("individual_customers")
    .select("id, name")
    .eq("id", body.customer_id)
    .is("deleted_at", null)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const { error: deleteError } = await serviceClient
    .from("individual_customers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", customer.id);

  if (deleteError) {
    return NextResponse.json({ error: "Failed to soft-delete customer" }, { status: 500 });
  }

  const { error: auditError } = await serviceClient.from("audit_logs").insert({
    user_id: user.id,
    action: "deletion_request",
    entity_type: "customer",
    entity_id: customer.id,
    new_data: {
      customer_name: customer.name,
      reason: body.reason,
      status: "completed",
      deleted_by: user.id,
    },
  });

  if (auditError) {
    return NextResponse.json({ error: "Deletion succeeded but audit logging failed — contact admin" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
