import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  // Check permissions: leads.edit + pipeline.create
  const { data: currentUser } = await supabase
    .from("users")
    .select("is_root")
    .eq("id", user.id)
    .single();

  if (!currentUser?.is_root) {
    const { data: perms } = await supabase
      .from("user_roles")
      .select("role:roles(role_permissions:role_permissions(permission:permissions(slug)))")
      .eq("user_id", user.id);

    const slugs = new Set<string>();
    for (const ur of perms ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const role = ur.role as any;
      for (const rp of role?.role_permissions ?? []) {
        if (rp.permission?.slug) slugs.add(rp.permission.slug as string);
      }
    }

    if (!slugs.has("leads.edit") || !slugs.has("pipeline.create")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
  }

  // Fetch lead
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (lead.stage !== "qualified") {
    return NextResponse.json({ error: "Only qualified leads can be converted to opportunities" }, { status: 400 });
  }

  // Parse optional body
  const body = await request.json().catch(() => ({}));
  const title = body.title || `Opportunity: ${lead.full_name}`;
  const expectedValue = body.expected_value || 0;
  const expectedDate = body.expected_date || null;

  // Create opportunity
  const { data: opportunity, error: oppError } = await supabase
    .from("opportunities")
    .insert({
      lead_id: lead.id,
      customer_id: null,
      title,
      stage: "new",
      expected_value: expectedValue,
      expected_date: expectedDate,
      assigned_to: lead.assigned_to,
      notes: lead.notes,
    })
    .select()
    .single();

  if (oppError) {
    return NextResponse.json({ error: oppError.message }, { status: 500 });
  }

  // Log activity on the lead
  await supabase.from("activities").insert({
    entity_type: "lead",
    entity_id: lead.id,
    activity_type: "system",
    subject: "Converted to opportunity",
    description: `Created opportunity: ${title}`,
    created_by: user.id,
  });

  // Log activity on the opportunity
  await supabase.from("activities").insert({
    entity_type: "opportunity",
    entity_id: opportunity.id,
    activity_type: "system",
    subject: "Created from lead",
    description: `Converted from lead: ${lead.full_name}`,
    created_by: user.id,
  });

  return NextResponse.json({ opportunity }, { status: 201 });
}
