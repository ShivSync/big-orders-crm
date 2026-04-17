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
      p_permission_slug: "discovery.scan",
    });
    if (!hasPerm) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => null);
  if (!body?.lead_id) {
    return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("id, metadata, store_id")
    .eq("id", body.lead_id)
    .eq("lead_source", "google_maps")
    .is("deleted_at", null)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const { data: firecrawlSetting } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "firecrawl_api_key")
    .single();

  const firecrawlKey = firecrawlSetting?.value;
  if (!firecrawlKey) {
    return NextResponse.json({ error: "Firecrawl API key not configured" }, { status: 400 });
  }

  const metadata = (lead.metadata || {}) as Record<string, unknown>;
  const placeId = metadata.place_id as string;

  if (!placeId) {
    return NextResponse.json({ error: "Lead has no place_id for enrichment" }, { status: 400 });
  }

  // Get website URL from Google Places details
  const { data: googleSetting } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "google_places_api_key")
    .single();

  let websiteUrl: string | null = null;

  if (googleSetting?.value) {
    try {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=website,formatted_phone_number,opening_hours&key=${googleSetting.value}`;
      const detailsRes = await fetch(detailsUrl);
      const detailsData = await detailsRes.json();
      if (detailsData.result?.website) {
        websiteUrl = detailsData.result.website;
      }
      if (detailsData.result?.formatted_phone_number && !lead.metadata) {
        metadata.phone = detailsData.result.formatted_phone_number;
      }
    } catch {
      // continue without website
    }
  }

  let enrichedData: Record<string, unknown> = {};

  if (websiteUrl) {
    try {
      const parsed = new URL(websiteUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        websiteUrl = null;
      }
      const blocked = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.)/.test(parsed.hostname);
      if (blocked) websiteUrl = null;
    } catch {
      websiteUrl = null;
    }
  }

  if (websiteUrl) {
    try {
      const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: websiteUrl,
          formats: ["extract"],
          extract: {
            schema: {
              type: "object",
              properties: {
                company_name: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" },
                employee_count: { type: "number" },
                description: { type: "string" },
              },
            },
          },
        }),
      });
      const fcData = await fcRes.json();
      if (fcData.success && fcData.data?.extract) {
        enrichedData = fcData.data.extract;
      }
    } catch {
      // continue without enrichment
    }
  }

  const updatedMetadata = {
    ...metadata,
    website: websiteUrl,
    enriched_at: new Date().toISOString(),
    enrichment: enrichedData,
  };

  const { error } = await supabase
    .from("leads")
    .update({ metadata: updatedMetadata })
    .eq("id", body.lead_id);

  if (error) {
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }

  return NextResponse.json({ data: { enriched: true, website: websiteUrl, enrichment: enrichedData } });
}
