"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, Eye, Building2, DollarSign, Users } from "lucide-react";
import { toast } from "sonner";
import type { Organization, OrganizationType, OrgSize, Store } from "@/types/database";

function sanitizeSearch(input: string): string {
  return input.replace(/[%_\\(),.*]/g, "").trim();
}

const ORG_TYPES: OrganizationType[] = ["company", "school", "university", "hotel", "club", "government_office", "event_venue", "other"];
const ORG_SIZES: OrgSize[] = ["small", "medium", "large", "enterprise"];
const INDUSTRIES = ["education", "hospitality", "technology", "corporate", "retail", "government", "healthcare", "entertainment", "other"];

const orgTypeColors: Record<OrganizationType, string> = {
  company: "bg-blue-100 text-blue-800",
  school: "bg-green-100 text-green-800",
  university: "bg-purple-100 text-purple-800",
  hotel: "bg-orange-100 text-orange-800",
  club: "bg-pink-100 text-pink-800",
  government_office: "bg-yellow-100 text-yellow-800",
  event_venue: "bg-red-100 text-red-800",
  other: "bg-gray-100 text-gray-800",
};

export default function OrganizationsPage() {
  const t = useTranslations("organizations");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [orgs, setOrgs] = useState<(Organization & { store?: Store | null })[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [filterType, setFilterType] = useState<string>("all");
  const [filterIndustry, setFilterIndustry] = useState<string>("all");
  const [filterCity, setFilterCity] = useState<string>("all");
  const [filterStore, setFilterStore] = useState<string>("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("organizations")
      .select("*, store:stores(*)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (filterType !== "all") query = query.eq("organization_type", filterType);
    if (filterIndustry !== "all") query = query.eq("industry", filterIndustry);
    if (filterCity !== "all") query = query.eq("city", filterCity);
    if (filterStore !== "all") query = query.eq("store_id", filterStore);
    const cleaned = sanitizeSearch(searchQuery);
    if (cleaned) {
      query = query.or(`name_vi.ilike.%${cleaned}%,name_en.ilike.%${cleaned}%,main_phone.ilike.%${cleaned}%,tax_id.ilike.%${cleaned}%`);
    }

    const [orgsRes, storesRes] = await Promise.all([
      query,
      supabase.from("stores").select("*").eq("active", true),
    ]);

    setOrgs(orgsRes.data ?? []);
    setStores(storesRes.data ?? []);
    setLoading(false);
  }, [filterType, filterIndustry, filterCity, filterStore, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      name_vi: form.get("name_vi") as string,
      name_en: (form.get("name_en") as string) || null,
      tax_id: (form.get("tax_id") as string) || null,
      organization_type: form.get("organization_type") as OrganizationType,
      industry: (form.get("industry") as string) || null,
      size: (form.get("size") as string) || null,
      store_id: form.get("store_id") as string || null,
      city: (form.get("city") as string) || null,
      district: (form.get("district") as string) || null,
      ward: (form.get("ward") as string) || null,
      address: (form.get("address") as string) || null,
      website: (form.get("website") as string) || null,
      main_phone: (form.get("main_phone") as string) || null,
      main_email: (form.get("main_email") as string) || null,
    };
    if (data.store_id === "none") data.store_id = null;
    if (data.industry === "none") data.industry = null;
    if (data.size === "none") data.size = null;

    const { error } = await supabase.from("organizations").insert(data);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("orgCreated"));
    setDialogOpen(false);
    loadData();
  }

  const orgTypeLabel = (ot: OrganizationType) => {
    const map: Record<OrganizationType, string> = {
      company: "typeCompany", school: "typeSchool", university: "typeUniversity", hotel: "typeHotel",
      club: "typeClub", government_office: "typeGovernment", event_venue: "typeEventVenue", other: "typeOther",
    };
    return t(map[ot]);
  };

  const sizeLabel = (s: OrgSize) => {
    const map: Record<OrgSize, string> = {
      small: "sizeSmall", medium: "sizeMedium", large: "sizeLarge", enterprise: "sizeEnterprise",
    };
    return t(map[s]);
  };

  const industryLabel = (ind: string) => {
    const map: Record<string, string> = {
      education: "industryEducation", hospitality: "industryHospitality", technology: "industryTechnology",
      corporate: "industryCorporate", retail: "industryRetail", government: "industryGovernment",
      healthcare: "industryHealthcare", entertainment: "industryEntertainment", other: "industryOther",
    };
    return t(map[ind] || "industryOther");
  };

  const totalOrgs = orgs.length;
  const totalRevenue = orgs.reduce((sum, o) => sum + Number(o.total_revenue), 0);
  const cities = [...new Set(orgs.map((o) => o.city).filter(Boolean))] as string[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
            <Plus className="mr-2 h-4 w-4" />
            {t("createOrg")}
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{t("createOrg")}</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>{t("nameVi")} *</Label>
                  <Input name="name_vi" required />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>{t("nameEn")}</Label>
                  <Input name="name_en" />
                </div>
                <div className="space-y-2">
                  <Label>{t("taxId")}</Label>
                  <Input name="tax_id" />
                </div>
                <div className="space-y-2">
                  <Label>{t("orgType")}</Label>
                  <Select name="organization_type" defaultValue="company">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORG_TYPES.map((ot) => (
                        <SelectItem key={ot} value={ot}>{orgTypeLabel(ot)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("industry")}</Label>
                  <Select name="industry" defaultValue="none">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind} value={ind}>{industryLabel(ind)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("size")}</Label>
                  <Select name="size" defaultValue="none">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {ORG_SIZES.map((s) => (
                        <SelectItem key={s} value={s}>{sizeLabel(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("mainPhone")}</Label>
                  <Input name="main_phone" />
                </div>
                <div className="space-y-2">
                  <Label>{t("mainEmail")}</Label>
                  <Input name="main_email" type="email" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>{t("website")}</Label>
                  <Input name="website" placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>{t("store")}</Label>
                  <Select name="store_id" defaultValue="none">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {stores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("city")}</Label>
                  <Input name="city" />
                </div>
                <div className="space-y-2">
                  <Label>{t("district")}</Label>
                  <Input name="district" />
                </div>
                <div className="space-y-2">
                  <Label>{t("ward")}</Label>
                  <Input name="ward" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>{t("address")}</Label>
                  <Input name="address" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{tCommon("cancel")}</Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700">{tCommon("save")}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t("totalOrgs"), value: totalOrgs, icon: Building2, color: "text-gray-900" },
          { label: t("totalRevenue"), value: `₫${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-green-600" },
          { label: t("linkedContacts"), value: "—", icon: Users, color: "text-blue-600" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <stat.icon className="h-8 w-8 text-gray-200" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-end gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={`${tCommon("search")}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v ?? "all")}>
          <SelectTrigger className="w-44"><SelectValue placeholder={t("orgType")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("all")}</SelectItem>
            {ORG_TYPES.map((ot) => (
              <SelectItem key={ot} value={ot}>{orgTypeLabel(ot)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterIndustry} onValueChange={(v) => setFilterIndustry(v ?? "all")}>
          <SelectTrigger className="w-40"><SelectValue placeholder={t("industry")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("all")}</SelectItem>
            {INDUSTRIES.map((ind) => (
              <SelectItem key={ind} value={ind}>{industryLabel(ind)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStore} onValueChange={(v) => setFilterStore(v ?? "all")}>
          <SelectTrigger className="w-40"><SelectValue placeholder={t("store")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("all")}</SelectItem>
            {stores.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {cities.length > 0 && (
          <Select value={filterCity} onValueChange={(v) => setFilterCity(v ?? "all")}>
            <SelectTrigger className="w-40"><SelectValue placeholder={t("city")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon("all")}</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{locale === "vi" ? t("nameVi") : t("nameEn")}</TableHead>
                <TableHead>{t("orgType")}</TableHead>
                <TableHead>{t("industry")}</TableHead>
                <TableHead>{t("size")}</TableHead>
                <TableHead>{t("city")}</TableHead>
                <TableHead>{t("store")}</TableHead>
                <TableHead>{t("totalRevenue")}</TableHead>
                <TableHead>{t("createdAt")}</TableHead>
                <TableHead>{tCommon("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">{tCommon("loading")}</TableCell>
                </TableRow>
              ) : orgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">{tCommon("noData")}</TableCell>
                </TableRow>
              ) : (
                orgs.map((org) => (
                  <TableRow key={org.id} className="cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/organizations/${org.id}`)}>
                    <TableCell className="font-medium">{locale === "vi" ? org.name_vi : (org.name_en || org.name_vi)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${orgTypeColors[org.organization_type]}`}>
                        {orgTypeLabel(org.organization_type)}
                      </span>
                    </TableCell>
                    <TableCell>{org.industry ? industryLabel(org.industry) : "—"}</TableCell>
                    <TableCell>{org.size ? sizeLabel(org.size) : "—"}</TableCell>
                    <TableCell>{org.city || "—"}</TableCell>
                    <TableCell>{org.store?.name || "—"}</TableCell>
                    <TableCell>₫{Number(org.total_revenue).toLocaleString()}</TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {new Date(org.created_at).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/organizations/${org.id}`); }}>
                        <Eye className="h-4 w-4" />
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
