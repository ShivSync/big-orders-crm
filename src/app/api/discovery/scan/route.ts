import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateLeadScore, haversineDistance } from "@/lib/scoring";

const PLACE_TYPES = [
  "school", "university", "lodging", "convention_center",
  "corporate_office", "hospital", "local_government_office",
];

const PLACE_TYPE_TO_CATEGORY: Record<string, string> = {
  school: "school",
  university: "university",
  lodging: "hotel",
  convention_center: "event_venue",
  corporate_office: "company",
  hospital: "hospital",
  local_government_office: "government",
};

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
  if (!body?.store_id) {
    return NextResponse.json({ error: "store_id is required" }, { status: 400 });
  }

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, lat, lng, territory_radius_km, city")
    .eq("id", body.store_id)
    .single();

  if (!store || !store.lat || !store.lng) {
    return NextResponse.json({ error: "Store not found or missing coordinates" }, { status: 404 });
  }

  // Rate limit: one scan per store per hour
  const { data: recentLeads } = await supabase
    .from("leads")
    .select("created_at")
    .eq("lead_source", "google_maps")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (recentLeads?.[0]?.created_at) {
    const lastScanAge = Date.now() - new Date(recentLeads[0].created_at).getTime();
    if (lastScanAge < 60 * 60 * 1000) {
      return NextResponse.json({ error: "Store scanned recently. Try again in 1 hour." }, { status: 429 });
    }
  }

  const { data: apiKeySetting } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "google_places_api_key")
    .single();

  const apiKey = apiKeySetting?.value;
  if (!apiKey) {
    return NextResponse.json({ error: "Google Places API key not configured" }, { status: 400 });
  }

  const radiusM = (store.territory_radius_km || 3) * 1000;
  const discovered: Array<{
    name: string;
    phone?: string;
    address?: string;
    lat: number;
    lng: number;
    category: string;
    place_id: string;
    distance_km: number;
    score: number;
  }> = [];

  const { data: competitors } = await supabase
    .from("competitor_locations")
    .select("lat, lng");

  for (const placeType of PLACE_TYPES) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${store.lat},${store.lng}&radius=${radiusM}&type=${placeType}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== "OK" || !data.results) continue;

      for (const place of data.results) {
        const placeLat = place.geometry?.location?.lat;
        const placeLng = place.geometry?.location?.lng;
        if (!placeLat || !placeLng) continue;

        const distKm = haversineDistance(store.lat, store.lng, placeLat, placeLng);
        const category = PLACE_TYPE_TO_CATEGORY[placeType] || "other";

        const competitorCount = (competitors || []).filter(c =>
          haversineDistance(placeLat, placeLng, Number(c.lat), Number(c.lng)) < 0.5
        ).length;

        const score = calculateLeadScore({
          distanceKm: distKm,
          category,
          competitorCount,
        });

        discovered.push({
          name: place.name,
          phone: place.formatted_phone_number || undefined,
          address: place.vicinity,
          lat: placeLat,
          lng: placeLng,
          category,
          place_id: place.place_id,
          distance_km: Math.round(distKm * 100) / 100,
          score,
        });
      }
    } catch {
      continue;
    }
  }

  // Dedup by place_id
  const seen = new Set<string>();
  const unique = discovered.filter(d => {
    if (seen.has(d.place_id)) return false;
    seen.add(d.place_id);
    return true;
  });

  // Check existing leads to avoid duplicates
  const placeIds = unique.map(d => d.place_id);
  const { data: existingLeads } = await supabase
    .from("leads")
    .select("metadata")
    .eq("lead_source", "google_maps")
    .is("deleted_at", null);

  const existingPlaceIds = new Set(
    (existingLeads || [])
      .map(l => (l.metadata as Record<string, string>)?.place_id)
      .filter(id => id && placeIds.includes(id))
  );

  const newLeads = unique.filter(d => !existingPlaceIds.has(d.place_id));

  // Insert new leads
  let insertedCount = 0;
  for (const lead of newLeads) {
    const { error } = await supabase.from("leads").insert({
      full_name: lead.name,
      phone: lead.phone || null,
      lead_source: "google_maps",
      stage: "new",
      city: store.city || null,
      store_id: store.id,
      metadata: {
        place_id: lead.place_id,
        address: lead.address,
        lat: lead.lat,
        lng: lead.lng,
        category: lead.category,
        distance_km: lead.distance_km,
        score: lead.score,
        discovered_at: new Date().toISOString(),
        discovered_from_store: store.id,
      },
    });
    if (!error) insertedCount++;
  }

  return NextResponse.json({
    data: {
      store_id: store.id,
      total_found: unique.length,
      new_leads: insertedCount,
      already_existed: unique.length - newLeads.length,
    },
  });
}
