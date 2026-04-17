"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, MapPin, Radar, Sparkles, Loader2 } from "lucide-react";

const DiscoveryMap = dynamic(() => import("./discovery-map"), { ssr: false });

interface Store {
  id: string;
  name: string;
  lat: number;
  lng: number;
  territory_radius_km: number;
  city: string;
  region: string;
}

interface DiscoveredLead {
  id: string;
  full_name: string;
  phone: string | null;
  city: string | null;
  stage: string;
  store_id: string;
  metadata: {
    place_id?: string;
    lat?: number;
    lng?: number;
    category?: string;
    distance_km?: number;
    score?: number;
    enriched_at?: string;
    enrichment?: Record<string, unknown>;
  };
  created_at: string;
}

const CATEGORIES = [
  "school", "university", "company", "hotel", "event_venue",
  "restaurant", "club", "hospital", "government", "other",
];

const categoryColors: Record<string, string> = {
  school: "bg-blue-100 text-blue-800",
  university: "bg-indigo-100 text-indigo-800",
  company: "bg-gray-100 text-gray-800",
  hotel: "bg-purple-100 text-purple-800",
  event_venue: "bg-pink-100 text-pink-800",
  restaurant: "bg-orange-100 text-orange-800",
  club: "bg-yellow-100 text-yellow-800",
  hospital: "bg-red-100 text-red-800",
  government: "bg-green-100 text-green-800",
  other: "bg-gray-100 text-gray-600",
};

export default function DiscoveryPage() {
  const t = useTranslations("discovery");
  const [stores, setStores] = useState<Store[]>([]);
  const [leads, setLeads] = useState<DiscoveredLead[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [enriching, setEnriching] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const loadStores = useCallback(async () => {
    const res = await fetch("/api/discovery/results?_stores=1");
    // Load stores from a separate lightweight call
    const storesRes = await fetch("/api/users"); // piggyback on existing API that loads stores
    // Actually let's just fetch stores directly
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data } = await supabase
      .from("stores")
      .select("id, name, lat, lng, territory_radius_km, city, region")
      .eq("active", true)
      .order("name");
    setStores((data as Store[]) || []);
  }, []);

  const loadLeads = useCallback(async () => {
    const params = selectedStore ? `?store_id=${selectedStore}` : "";
    const res = await fetch(`/api/discovery/results${params}`);
    if (res.ok) {
      const json = await res.json();
      setLeads(json.data || []);
    }
  }, [selectedStore]);

  useEffect(() => { loadStores(); }, [loadStores]);
  useEffect(() => { loadLeads(); }, [loadLeads]);

  const handleScan = async (storeId: string) => {
    setScanning(true);
    setScanResult(null);
    const res = await fetch("/api/discovery/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store_id: storeId }),
    });
    if (res.ok) {
      const json = await res.json();
      setScanResult(`${t("scanComplete")}: ${json.data.new_leads} new, ${json.data.already_existed} existing`);
      loadLeads();
    } else {
      const json = await res.json().catch(() => ({}));
      setScanResult(json.error || t("scanFailed"));
    }
    setScanning(false);
  };

  const handleEnrich = async (leadId: string) => {
    setEnriching(leadId);
    await fetch("/api/discovery/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: leadId }),
    });
    loadLeads();
    setEnriching(null);
  };

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (categoryFilter) {
      result = result.filter(l => l.metadata?.category === categoryFilter);
    }
    return result.sort((a, b) => (b.metadata?.score || 0) - (a.metadata?.score || 0));
  }, [leads, categoryFilter]);

  const stats = useMemo(() => {
    const total = leads.length;
    const avgScore = total > 0 ? Math.round(leads.reduce((s, l) => s + (l.metadata?.score || 0), 0) / total) : 0;
    const categoryCounts: Record<string, number> = {};
    leads.forEach(l => {
      const cat = l.metadata?.category || "other";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const topCat = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
    return { total, avgScore, topCategory: topCat?.[0] || "-" };
  }, [leads]);

  const selectedStoreData = stores.find(s => s.id === selectedStore);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex gap-2">
          {selectedStore && (
            <Button onClick={() => handleScan(selectedStore)} disabled={scanning}>
              {scanning ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Radar className="h-4 w-4 mr-1" />}
              {scanning ? t("scanning") : t("scanStore")}
            </Button>
          )}
        </div>
      </div>

      {scanResult && (
        <div className="p-3 rounded text-sm bg-blue-50 text-blue-800">{scanResult}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">{t("stores")}</div>
            <div className="text-2xl font-bold">{stores.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">{t("totalDiscovered")}</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">{t("avgScore")}</div>
            <div className="text-2xl font-bold">{stats.avgScore}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">{t("topCategory")}</div>
            <div className="text-2xl font-bold">{stats.topCategory !== "-" ? t(`categories.${stats.topCategory}`) : "-"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap relative z-10">
        <Select value={selectedStore} onValueChange={(v) => { if (v) setSelectedStore(v === "all" ? "" : v); }}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder={t("selectStore")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStores")}</SelectItem>
            {stores.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={(v) => { if (v) setCategoryFilter(v === "all" ? "" : v); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("filterByCategory")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStores")}</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Map */}
      <Card className="relative z-0">
        <CardContent className="p-0 h-[400px]">
          <DiscoveryMap
            stores={stores}
            leads={filteredLeads}
            selectedStore={selectedStoreData || null}
          />
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("leads")}</TableHead>
                <TableHead>{t("category")}</TableHead>
                <TableHead>{t("score")}</TableHead>
                <TableHead>{t("distance")}</TableHead>
                <TableHead>{t("stores")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {t("noResults")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map(lead => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="font-medium">{lead.full_name}</div>
                      {lead.phone && <div className="text-xs text-muted-foreground">{lead.phone}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge className={categoryColors[lead.metadata?.category || "other"]}>
                        {t(`categories.${lead.metadata?.category || "other"}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`font-bold ${(lead.metadata?.score || 0) >= 70 ? "text-green-600" : (lead.metadata?.score || 0) >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                        {lead.metadata?.score || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      {lead.metadata?.distance_km ? `${lead.metadata.distance_km} ${t("km")}` : "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {lead.store_id}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEnrich(lead.id)}
                        disabled={enriching === lead.id || !!lead.metadata?.enriched_at}
                      >
                        {enriching === lead.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Sparkles className="h-3 w-3 mr-1" />
                        )}
                        {lead.metadata?.enriched_at ? "✓" : t("enrichData")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
