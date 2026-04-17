"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, Eye } from "lucide-react";
import { toast } from "sonner";
import type { Lead, LeadStage, LeadType, LeadSource, Store, User } from "@/types/database";

function sanitizeSearch(input: string): string {
  return input.replace(/[%_\\(),.*]/g, "").trim();
}

const STAGES: LeadStage[] = ["new", "contacted", "qualified", "converted", "lost"];
const LEAD_TYPES: LeadType[] = ["individual", "parent", "school", "company"];
const LEAD_SOURCES: LeadSource[] = ["manual", "event", "campaign", "platform", "web_app", "company_school", "google_maps", "oms_sync"];

const stageColors: Record<LeadStage, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  qualified: "bg-green-100 text-green-800",
  converted: "bg-purple-100 text-purple-800",
  lost: "bg-gray-100 text-gray-800",
};

export default function LeadsPage() {
  const t = useTranslations("leads");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [leads, setLeads] = useState<(Lead & { store?: Store | null; assigned_user?: Pick<User, "id" | "name" | "email"> | null })[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<Pick<User, "id" | "name" | "email">[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filters
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterStore, setFilterStore] = useState<string>("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("leads")
      .select("*, store:stores(*), assigned_user:users!leads_assigned_to_fkey(id, name, email)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (filterStage !== "all") query = query.eq("stage", filterStage);
    if (filterSource !== "all") query = query.eq("lead_source", filterSource);
    if (filterStore !== "all") query = query.eq("store_id", filterStore);
    const cleaned = sanitizeSearch(searchQuery);
    if (cleaned) {
      query = query.or(`full_name.ilike.%${cleaned}%,phone.ilike.%${cleaned}%,email.ilike.%${cleaned}%`);
    }

    const [leadsRes, storesRes, usersRes] = await Promise.all([
      query,
      supabase.from("stores").select("*").eq("active", true),
      supabase.from("users").select("id, name, email").eq("status", "active"),
    ]);

    setLeads(leadsRes.data ?? []);
    setStores(storesRes.data ?? []);
    setUsers(usersRes.data ?? []);
    setLoading(false);
  }, [filterStage, filterSource, filterStore, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreateLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      full_name: form.get("full_name") as string,
      phone: form.get("phone") as string || null,
      email: form.get("email") as string || null,
      lead_type: form.get("lead_type") as LeadType,
      lead_source: form.get("lead_source") as LeadSource,
      store_id: form.get("store_id") as string || null,
      assigned_to: form.get("assigned_to") as string || null,
      city: form.get("city") as string || null,
      district: form.get("district") as string || null,
      ward: form.get("ward") as string || null,
      address: form.get("address") as string || null,
      notes: form.get("notes") as string || null,
    };
    if (data.store_id === "none") data.store_id = null;
    if (data.assigned_to === "none") data.assigned_to = null;

    const { error } = await supabase.from("leads").insert(data);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("leadCreated"));
    setDialogOpen(false);
    loadData();
  }

  const stageKey = (s: LeadStage) => {
    const map: Record<LeadStage, string> = {
      new: "stageNew", contacted: "stageContacted", qualified: "stageQualified",
      converted: "stageConverted", lost: "stageLost",
    };
    return t(map[s]);
  };

  const typeKey = (lt: LeadType) => {
    const map: Record<LeadType, string> = {
      individual: "typeIndividual", parent: "typeParent", school: "typeSchool", company: "typeCompany",
    };
    return t(map[lt]);
  };

  const sourceKey = (ls: LeadSource) => {
    const map: Record<LeadSource, string> = {
      manual: "sourceManual", event: "sourceEvent", campaign: "sourceCampaign", platform: "sourcePlatform",
      web_app: "sourceWebApp", company_school: "sourceCompanySchool", google_maps: "sourceGoogleMaps", oms_sync: "sourceOmsSync",
      embed_widget: "sourceEmbedWidget", chat_bot: "sourceChatBot", zalo: "sourceZalo", facebook: "sourceFacebook", phone_call: "sourcePhoneCall",
    };
    return t(map[ls]);
  };

  // Stats
  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.stage === "new").length;
  const qualifiedLeads = leads.filter((l) => l.stage === "qualified").length;
  const convertedLeads = leads.filter((l) => l.stage === "converted").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
            <Plus className="mr-2 h-4 w-4" />
            {t("createLead")}
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("createLead")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>{t("fullName")} *</Label>
                  <Input name="full_name" required />
                </div>
                <div className="space-y-2">
                  <Label>{t("phone")}</Label>
                  <Input name="phone" placeholder="+84..." />
                </div>
                <div className="space-y-2">
                  <Label>{t("email")}</Label>
                  <Input name="email" type="email" />
                </div>
                <div className="space-y-2">
                  <Label>{t("leadType")}</Label>
                  <Select name="lead_type" defaultValue="individual">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEAD_TYPES.map((lt) => (
                        <SelectItem key={lt} value={lt}>{typeKey(lt)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("leadSource")}</Label>
                  <Select name="lead_source" defaultValue="manual">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCES.map((ls) => (
                        <SelectItem key={ls} value={ls}>{sourceKey(ls)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label>{t("assignedTo")}</Label>
                  <Select name="assigned_to" defaultValue="none">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
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
                <div className="col-span-2 space-y-2">
                  <Label>{t("notes")}</Label>
                  <Textarea name="notes" rows={3} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700">
                  {tCommon("save")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: t("totalLeads"), value: totalLeads, color: "text-gray-900" },
          { label: t("newLeads"), value: newLeads, color: "text-blue-600" },
          { label: t("qualifiedLeads"), value: qualifiedLeads, color: "text-green-600" },
          { label: t("convertedLeads"), value: convertedLeads, color: "text-purple-600" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
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
        <Select value={filterStage} onValueChange={(v) => setFilterStage(v ?? "all")}>
          <SelectTrigger className="w-40"><SelectValue placeholder={t("stage")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("all")}</SelectItem>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>{stageKey(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={(v) => setFilterSource(v ?? "all")}>
          <SelectTrigger className="w-40"><SelectValue placeholder={t("leadSource")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("all")}</SelectItem>
            {LEAD_SOURCES.map((ls) => (
              <SelectItem key={ls} value={ls}>{sourceKey(ls)}</SelectItem>
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
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("fullName")}</TableHead>
                <TableHead>{t("phone")}</TableHead>
                <TableHead>{t("leadType")}</TableHead>
                <TableHead>{t("leadSource")}</TableHead>
                <TableHead>{t("stage")}</TableHead>
                <TableHead>{t("store")}</TableHead>
                <TableHead>{t("assignedTo")}</TableHead>
                <TableHead>{t("createdAt")}</TableHead>
                <TableHead>{tCommon("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    {tCommon("loading")}
                  </TableCell>
                </TableRow>
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    {tCommon("noData")}
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/leads/${lead.id}`)}>
                    <TableCell className="font-medium">{lead.full_name}</TableCell>
                    <TableCell>{lead.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{typeKey(lead.lead_type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sourceKey(lead.lead_source)}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stageColors[lead.stage]}`}>
                        {stageKey(lead.stage)}
                      </span>
                    </TableCell>
                    <TableCell>{lead.store?.name || "—"}</TableCell>
                    <TableCell>{lead.assigned_user?.name || "—"}</TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {new Date(lead.created_at).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/leads/${lead.id}`); }}>
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
