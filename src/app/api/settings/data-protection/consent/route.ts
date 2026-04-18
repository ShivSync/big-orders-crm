import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = await createServiceClient();

  const { data: currentUser } = await serviceClient
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
  const search = params.get("search");
  const consent = params.get("consent");
  const format = params.get("format");

  let query = serviceClient
    .from("individual_customers")
    .select("id, name, phone, email, consent_given, consent_date, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (search) {
    const sanitized = search.replace(/[%_,().*+?^${}|[\]\\]/g, "");
    if (sanitized) {
      query = query.or(`name.ilike.%${sanitized}%,phone.ilike.%${sanitized}%`);
    }
  }
  if (consent === "yes") {
    query = query.eq("consent_given", true);
  } else if (consent === "no") {
    query = query.eq("consent_given", false);
  }

  if (format === "csv") {
    query = query.limit(5000);
    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: "Failed to export" }, { status: 500 });
    }

    const rows = (data || []).map((c) => ({
      name: c.name,
      phone: c.phone,
      email: c.email || "",
      consent_given: c.consent_given ? "Yes" : "No",
      consent_date: c.consent_date || "",
    }));

    function sanitizeCsvCell(val: string): string {
      const escaped = val.replace(/"/g, '""');
      if (/^[=+\-@\t\r]/.test(escaped)) return `"'${escaped}"`;
      return `"${escaped}"`;
    }

    const headers = ["name", "phone", "email", "consent_given", "consent_date"];
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => sanitizeCsvCell(String(r[h as keyof typeof r]))).join(",")),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=consent-report.csv`,
      },
    });
  }

  query = query.range(offset, offset + limit - 1);
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to load consent data" }, { status: 500 });
  }

  return NextResponse.json({ data });
}
