import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: categories, error: catErr } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("active", true)
    .order("sort_order");

  if (catErr) {
    console.error("Menu categories fetch error:", catErr);
    return NextResponse.json({ error: "Failed to fetch menu" }, { status: 500 });
  }

  const { data: items, error: itemErr } = await supabase
    .from("menu_items")
    .select("*")
    .eq("active", true)
    .order("sort_order");

  if (itemErr) {
    console.error("Menu items fetch error:", itemErr);
    return NextResponse.json({ error: "Failed to fetch menu items" }, { status: 500 });
  }

  return NextResponse.json({ categories, items });
}
