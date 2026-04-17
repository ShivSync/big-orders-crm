import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const LEAD_TYPE_TO_CONTACT: Record<string, string> = {
  individual: "other",
  parent: "parent",
  school: "teacher",
  company: "employee",
};

export async function POST(
  _request: NextRequest,
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
    const { data: hasLeadPerm } = await supabase.rpc("user_has_permission", {
      p_user_id: user.id,
      p_permission_slug: "leads.edit",
    });
    const { data: hasCustPerm } = await supabase.rpc("user_has_permission", {
      p_user_id: user.id,
      p_permission_slug: "customers.edit",
    });
    if (!hasLeadPerm || !hasCustPerm) {
      return NextResponse.json({ error: "Forbidden: requires leads.edit + customers.edit" }, { status: 403 });
    }
  }

  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (leadErr || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (lead.stage !== "qualified" && lead.stage !== "contacted") {
    return NextResponse.json({ error: "Lead must be in qualified or contacted stage" }, { status: 400 });
  }

  if (lead.phone) {
    const { data: existing } = await supabase
      .from("individual_customers")
      .select("id")
      .eq("phone", lead.phone)
      .is("deleted_at", null)
      .limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Customer with this phone already exists", existingId: existing[0].id }, { status: 409 });
    }
  }

  const { data: customer, error: custErr } = await supabase
    .from("individual_customers")
    .insert({
      lead_id: lead.id,
      full_name: lead.full_name,
      phone: lead.phone,
      email: lead.email,
      contact_type: LEAD_TYPE_TO_CONTACT[lead.lead_type] || "other",
      gender: lead.gender,
      dob: lead.dob,
      address: lead.address,
      ward: lead.ward,
      district: lead.district,
      city: lead.city,
      store_id: lead.store_id,
    })
    .select("id")
    .single();

  if (custErr) {
    return NextResponse.json({ error: custErr.message }, { status: 500 });
  }

  const { error: stageErr } = await supabase
    .from("leads")
    .update({ stage: "converted" })
    .eq("id", lead.id);

  if (stageErr) {
    return NextResponse.json({ error: stageErr.message }, { status: 500 });
  }

  await supabase.from("activities").insert({
    entity_type: "lead",
    entity_id: lead.id,
    activity_type: "system",
    subject: `Converted to customer (${customer.id})`,
    created_by: user.id,
  });

  return NextResponse.json({ data: { customerId: customer.id } });
}
