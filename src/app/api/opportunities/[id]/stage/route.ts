import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_STAGES = ["new", "consulting", "quoted", "negotiating", "won", "lost"] as const;

export async function PATCH(
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
      p_permission_slug: "pipeline.edit",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.stage) {
    return NextResponse.json({ error: "Stage is required" }, { status: 400 });
  }

  if (!VALID_STAGES.includes(body.stage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }

  // Fetch current opportunity
  const { data: opp, error: fetchErr } = await supabase
    .from("opportunities")
    .select("id, stage")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (fetchErr || !opp) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  }

  // Won requires actual_value
  if (body.stage === "won") {
    if (!body.actual_value || parseInt(String(body.actual_value), 10) <= 0) {
      return NextResponse.json({ error: "Won stage requires a positive actual_value" }, { status: 400 });
    }
  }

  // Lost requires lost_reason
  if (body.stage === "lost") {
    if (!body.lost_reason?.trim()) {
      return NextResponse.json({ error: "Lost stage requires a lost_reason" }, { status: 400 });
    }
  }

  const updateData: Record<string, unknown> = { stage: body.stage };
  if (body.stage === "won") {
    updateData.actual_value = parseInt(String(body.actual_value), 10);
  }
  if (body.stage === "lost") {
    updateData.lost_reason = body.lost_reason.trim();
  }

  const { error: updateErr } = await supabase
    .from("opportunities")
    .update(updateData)
    .eq("id", id)
    .is("deleted_at", null);

  if (updateErr) {
    console.error("Opportunity stage update error:", updateErr);
    return NextResponse.json({ error: "Failed to update stage" }, { status: 500 });
  }

  // Log activity
  await supabase.from("activities").insert({
    entity_type: "opportunity",
    entity_id: id,
    activity_type: "system",
    subject: `Stage changed: ${opp.stage} → ${body.stage}`,
    created_by: user.id,
  });

  return NextResponse.json({ success: true });
}
