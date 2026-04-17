"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Eye, Megaphone, Mail, MessageSquare, Send, Clock } from "lucide-react";
import type { Campaign, CampaignStatus, CampaignType } from "@/types/database";

function sanitizeSearch(input: string): string {
  return input.replace(/[%_\\(),.*]/g, "").trim();
}

const STATUSES: CampaignStatus[] = ["draft", "scheduled", "sending", "sent", "cancelled"];

const statusColors: Record<CampaignStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  scheduled: "bg-blue-100 text-blue-800",
  sending: "bg-yellow-100 text-yellow-800",
  sent: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_I18N: Record<CampaignStatus, string> = {
  draft: "statusDraft",
  scheduled: "statusScheduled",
  sending: "statusSending",
  sent: "statusSent",
  cancelled: "statusCancelled",
};

export default function CampaignsPage() {
  const t = useTranslations("campaigns");
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<CampaignType>("email");
  const [newSubject, setNewSubject] = useState("");
  const [newTemplate, setNewTemplate] = useState("");

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("campaigns")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }
    if (typeFilter !== "all") {
      query = query.eq("campaign_type", typeFilter);
    }
    if (search) {
      const s = sanitizeSearch(search);
      if (s) query = query.ilike("name", `%${s}%`);
    }

    const { data } = await query;
    setCampaigns(data || []);
    setLoading(false);
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreate = async () => {
    if (!newName.trim() || !newTemplate.trim()) return;
    if (newType === "email" && !newSubject.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          campaign_type: newType,
          subject: newSubject || null,
          template: newTemplate,
        }),
      });
      if (res.ok) {
        setCreateOpen(false);
        setNewName("");
        setNewType("email");
        setNewSubject("");
        setNewTemplate("");
        fetchCampaigns();
      }
    } finally {
      setCreating(false);
    }
  };

  const draftCount = campaigns.filter(c => c.status === "draft").length;
  const sentCount = campaigns.filter(c => c.status === "sent").length;
  const totalDelivered = campaigns.reduce((s, c) => s + c.delivered_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger>
            <Button><Plus className="mr-2 h-4 w-4" />{t("createCampaign")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("createCampaign")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t("campaignName")}</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div>
                <Label>{t("campaignType")}</Label>
                <Select value={newType} onValueChange={(v) => setNewType((v ?? "email") as CampaignType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">{t("typeEmail")}</SelectItem>
                    <SelectItem value="sms">{t("typeSms")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newType === "email" && (
                <div>
                  <Label>{t("subject")}</Label>
                  <Input value={newSubject} onChange={e => setNewSubject(e.target.value)} />
                </div>
              )}
              <div>
                <Label>{t("template")}</Label>
                <Textarea
                  value={newTemplate}
                  onChange={e => setNewTemplate(e.target.value)}
                  placeholder={t("templatePlaceholder")}
                  rows={5}
                />
                <p className="mt-1 text-xs text-muted-foreground">{t("variableHelp")}</p>
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {t("createCampaign")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Megaphone className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{campaigns.length}</p>
              <p className="text-sm text-muted-foreground">{t("title")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">{draftCount}</p>
              <p className="text-sm text-muted-foreground">{t("statusDraft")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Send className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{totalDelivered}</p>
              <p className="text-sm text-muted-foreground">{t("deliveredCount")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("campaignName")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("title")}</SelectItem>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>{t(STATUS_I18N[s])}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("campaignType")}</SelectItem>
            <SelectItem value="email">{t("typeEmail")}</SelectItem>
            <SelectItem value="sms">{t("typeSms")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("campaignName")}</TableHead>
              <TableHead>{t("campaignType")}</TableHead>
              <TableHead>{t("statusDraft")}</TableHead>
              <TableHead>{t("scheduledAt")}</TableHead>
              <TableHead>{t("sentCount")}</TableHead>
              <TableHead>{t("deliveredCount")}</TableHead>
              <TableHead>{t("failedCount")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : campaigns.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t("noCampaigns")}</TableCell></TableRow>
            ) : campaigns.map(campaign => (
              <TableRow key={campaign.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/campaigns/${campaign.id}`)}>
                <TableCell className="font-medium">{campaign.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1">
                    {campaign.campaign_type === "email" ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                    {t(campaign.campaign_type === "email" ? "typeEmail" : "typeSms")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[campaign.status]}>{t(STATUS_I18N[campaign.status])}</Badge>
                </TableCell>
                <TableCell>{campaign.scheduled_at ? new Date(campaign.scheduled_at).toLocaleString() : "—"}</TableCell>
                <TableCell>{campaign.sent_count}</TableCell>
                <TableCell>{campaign.delivered_count}</TableCell>
                <TableCell>{campaign.failed_count}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); router.push(`/campaigns/${campaign.id}`); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
