import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { maskPhone, maskEmail } from "@/lib/pii-mask";
import { checkRateLimit } from "@/lib/rate-limit";

function sanitizeCsvCell(v: string): string {
  const s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) return "'" + s;
  return s;
}

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${sanitizeCsvCell(v).replace(/"/g, '""')}"`;
  return [headers.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
}

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
    const { data: hasPerm } = await supabase.rpc("user_has_permission", {
      p_user_id: user.id,
      p_permission_slug: "reports.export",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (!checkRateLimit(`reports-export:${user.id}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  if (!type || !["leads", "customers", "orders"].includes(type)) {
    return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
  }

  const isRoot = currentUser?.is_root === true;
  const mp = (phone: string | null) => isRoot ? (phone || "") : maskPhone(phone);
  const me = (email: string | null) => isRoot ? (email || "") : maskEmail(email);

  let csv = "";
  let filename = "";

  if (type === "leads") {
    const { data: leads } = await supabase
      .from("leads")
      .select("full_name, phone, email, lead_type, lead_source, stage, city, district, ward, address, store_id, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5000);

    const { data: stores } = await supabase.from("stores").select("id, name");
    const storeMap = Object.fromEntries((stores ?? []).map(s => [s.id, s.name]));

    const headers = ["Name", "Phone", "Email", "Type", "Source", "Stage", "City", "District", "Ward", "Address", "Store", "Created"];
    const rows = (leads ?? []).map(l => [
      l.full_name, mp(l.phone), me(l.email), l.lead_type, l.lead_source, l.stage,
      l.city || "", l.district || "", l.ward || "", l.address || "",
      storeMap[l.store_id] || "", l.created_at?.slice(0, 10) || "",
    ]);
    csv = toCsv(headers, rows);
    filename = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
  }

  if (type === "customers") {
    const { data: customers } = await supabase
      .from("individual_customers")
      .select("full_name, phone, email, contact_type, city, district, total_revenue, order_count, last_order_date, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5000);

    const headers = ["Name", "Phone", "Email", "Type", "City", "District", "Total Revenue", "Order Count", "Last Order", "Created"];
    const rows = (customers ?? []).map(c => [
      c.full_name, mp(c.phone), me(c.email), c.contact_type,
      c.city || "", c.district || "",
      String(c.total_revenue || 0), String(c.order_count || 0),
      c.last_order_date?.slice(0, 10) || "", c.created_at?.slice(0, 10) || "",
    ]);
    csv = toCsv(headers, rows);
    filename = `customers-export-${new Date().toISOString().slice(0, 10)}.csv`;
  }

  if (type === "orders") {
    const { data: orders } = await supabase
      .from("orders")
      .select("order_number, contact_name, contact_phone, event_type, scheduled_date, guest_count, total_value, status, payment_status, source, store_id, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5000);

    const { data: stores } = await supabase.from("stores").select("id, name");
    const storeMap = Object.fromEntries((stores ?? []).map(s => [s.id, s.name]));

    const headers = ["Order #", "Contact", "Phone", "Event Type", "Date", "Guests", "Total", "Status", "Payment", "Source", "Store", "Created"];
    const rows = (orders ?? []).map(o => [
      o.order_number, o.contact_name, mp(o.contact_phone), o.event_type,
      o.scheduled_date?.slice(0, 10) || "", String(o.guest_count || ""),
      String(o.total_value || 0), o.status, o.payment_status, o.source || "",
      storeMap[o.store_id] || "", o.created_at?.slice(0, 10) || "",
    ]);
    csv = toCsv(headers, rows);
    filename = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
  }

  const { createServiceClient } = await import("@/lib/supabase/server");
  const serviceClient = await createServiceClient();
  await serviceClient.from("audit_logs").insert({
    user_id: user.id,
    action: "data_export",
    entity_type: type,
    new_data: { export_type: type, row_count: csv.split("\n").length - 1 },
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
