import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: recipients, error } = await supabase
    .from("campaign_recipients")
    .select("*, customer:individual_customers!campaign_recipients_customer_id_fkey(id, full_name)")
    .eq("campaign_id", id)
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    console.error("Recipients fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch recipients" }, { status: 500 });
  }

  return NextResponse.json({ data: recipients || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
      p_permission_slug: "campaigns.edit",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data: campaign, error: fetchErr } = await supabase
    .from("campaigns")
    .select("id, status, campaign_type, segment_filters")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (fetchErr || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (campaign.status !== "draft") {
    return NextResponse.json({ error: "Can only calculate recipients for draft campaigns" }, { status: 400 });
  }

  await supabase
    .from("campaign_recipients")
    .delete()
    .eq("campaign_id", id);

  const body = await request.json().catch(() => null);
  const customerIds = body?.customer_ids;

  if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
    return NextResponse.json({ error: "No customer IDs provided" }, { status: 400 });
  }

  const { data: customers } = await supabase
    .from("individual_customers")
    .select("id, phone, email")
    .in("id", customerIds.slice(0, 1000))
    .is("deleted_at", null);

  if (!customers || customers.length === 0) {
    return NextResponse.json({ error: "No valid customers found" }, { status: 400 });
  }

  const recipients = customers.map((c) => ({
    campaign_id: id,
    customer_id: c.id,
    channel: campaign.campaign_type,
    destination: campaign.campaign_type === "email" ? (c.email || "") : (c.phone || ""),
    status: "pending" as const,
  })).filter((r) => r.destination.length > 0);

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No valid recipients with contact info" }, { status: 400 });
  }

  const { error: insertErr } = await supabase
    .from("campaign_recipients")
    .insert(recipients);

  if (insertErr) {
    console.error("Recipients insert error:", insertErr);
    return NextResponse.json({ error: "Failed to save recipients" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    count: recipients.length,
  });
}
