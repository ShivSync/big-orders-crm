"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Send, Clock, Ban, Users, Mail, MessageSquare, RefreshCw,
} from "lucide-react";
import type {
  Campaign, CampaignRecipient, CampaignStatus, CampaignType,
  SegmentFilters, Store
} from "@/types/database";

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

const recipientStatusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  bounced: "bg-orange-100 text-orange-800",
};

export default function CampaignDetailPage() {
  const t = useTranslations("campaigns");
  const locale = useLocale();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<Campaign & { creator?: { id: string; name: string; email: string } | null } | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [stores, setStores] = useState<Pick<Store, "id" | "name">[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [segmentCount, setSegmentCount] = useState<number | null>(null);
  const [calculatingSegment, setCalculatingSegment] = useState(false);

  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editTemplate, setEditTemplate] = useState("");
  const [editType, setEditType] = useState<CampaignType>("email");
  const [filters, setFilters] = useState<SegmentFilters>({});

  const fetchCampaign = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${id}`);
    if (!res.ok) return;
    const { data } = await res.json();
    setCampaign(data);
    setEditName(data.name);
    setEditSubject(data.subject || "");
    setEditTemplate(data.template || "");
    setEditType(data.campaign_type);
    setFilters(data.segment_filters || {});
  }, [id]);

  const fetchRecipients = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${id}/recipients`);
    if (!res.ok) return;
    const { data } = await res.json();
    setRecipients(data || []);
  }, [id]);

  const fetchStores = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("stores")
      .select("id, name")
      .eq("active", true)
      .order("name");
    setStores(data || []);
  }, []);

  useEffect(() => {
    Promise.all([fetchCampaign(), fetchRecipients(), fetchStores()]).finally(() => setLoading(false));
  }, [fetchCampaign, fetchRecipients, fetchStores]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          campaign_type: editType,
          subject: editSubject || null,
          template: editTemplate,
          segment_filters: filters,
        }),
      });
      fetchCampaign();
    } finally {
      setSaving(false);
    }
  };

  const handleCalculateSegment = async () => {
    setCalculatingSegment(true);
    try {
      const res = await fetch("/api/campaigns/segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: editType, filters }),
      });
      if (!res.ok) return;
      const { data, count } = await res.json();
      setSegmentCount(count);

      if (data && data.length > 0) {
        await fetch(`/api/campaigns/${id}/recipients`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer_ids: data.map((c: { id: string }) => c.id) }),
        });
        fetchRecipients();
      }
    } finally {
      setCalculatingSegment(false);
    }
  };

  const handleSend = async () => {
    const res = await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
    if (res.ok) {
      setSendDialogOpen(false);
      fetchCampaign();
      fetchRecipients();
    }
  };

  const handleSchedule = async () => {
    if (!scheduledAt) return;
    await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "scheduled", scheduled_at: scheduledAt }),
    });
    setScheduleDialogOpen(false);
    fetchCampaign();
  };

  const handleCancel = async () => {
    await fetch(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    setCancelDialogOpen(false);
    fetchCampaign();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  }

  if (!campaign) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Campaign not found</div>;
  }

  const isDraft = campaign.status === "draft";
  const isSent = campaign.status === "sent";

  const pendingR = recipients.filter(r => r.status === "pending").length;
  const sentR = recipients.filter(r => r.status === "sent").length;
  const deliveredR = recipients.filter(r => r.status === "delivered").length;
  const failedR = recipients.filter(r => r.status === "failed").length;
  const bouncedR = recipients.filter(r => r.status === "bounced").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/campaigns")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> {t("title")}
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={statusColors[campaign.status]}>{t(STATUS_I18N[campaign.status])}</Badge>
            <Badge variant="outline" className="gap-1">
              {campaign.campaign_type === "email" ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
              {t(campaign.campaign_type === "email" ? "typeEmail" : "typeSms")}
            </Badge>
            {campaign.creator && (
              <span className="text-sm text-muted-foreground">{t("createdBy")}: {campaign.creator.name || campaign.creator.email}</span>
            )}
          </div>
        </div>
        {isDraft && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setScheduleDialogOpen(true)}>
              <Clock className="mr-1 h-4 w-4" /> {t("scheduleCampaign")}
            </Button>
            <Button onClick={() => setSendDialogOpen(true)} disabled={recipients.length === 0}>
              <Send className="mr-1 h-4 w-4" /> {t("sendCampaign")}
            </Button>
          </div>
        )}
        {(campaign.status === "draft" || campaign.status === "scheduled") && (
          <Button variant="destructive" size="sm" onClick={() => setCancelDialogOpen(true)}>
            <Ban className="mr-1 h-4 w-4" /> {t("cancelCampaign")}
          </Button>
        )}
      </div>

      {isDraft && (
        <Card>
          <CardHeader><CardTitle>{t("editCampaign")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("campaignName")}</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div>
                <Label>{t("campaignType")}</Label>
                <Select value={editType} onValueChange={(v) => { if (v) setEditType(v as CampaignType); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">{t("typeEmail")}</SelectItem>
                    <SelectItem value="sms">{t("typeSms")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editType === "email" && (
              <div>
                <Label>{t("subject")}</Label>
                <Input value={editSubject} onChange={e => setEditSubject(e.target.value)} />
              </div>
            )}
            <div>
              <Label>{t("template")}</Label>
              <Textarea
                value={editTemplate}
                onChange={e => setEditTemplate(e.target.value)}
                placeholder={t("templatePlaceholder")}
                rows={6}
              />
              <p className="mt-1 text-xs text-muted-foreground">{t("variableHelp")}</p>
            </div>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : t("editCampaign")}</Button>
          </CardContent>
        </Card>
      )}

      {isDraft && (
        <Card>
          <CardHeader><CardTitle>{t("segmentFilters")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>{t("customerType")}</Label>
                <Input
                  placeholder="parent, employee..."
                  value={filters.customer_type?.join(", ") || ""}
                  onChange={e => setFilters({ ...filters, customer_type: e.target.value ? e.target.value.split(",").map(s => s.trim()).filter(Boolean) : undefined })}
                />
              </div>
              <div>
                <Label>{t("city")}</Label>
                <Input
                  placeholder="Hà Nội, Hồ Chí Minh..."
                  value={filters.city?.join(", ") || ""}
                  onChange={e => setFilters({ ...filters, city: e.target.value ? e.target.value.split(",").map(s => s.trim()).filter(Boolean) : undefined })}
                />
              </div>
              <div>
                <Label>{t("store")}</Label>
                <Select
                  value={filters.store_id?.[0] || "all"}
                  onValueChange={(v) => setFilters({ ...filters, store_id: v && v !== "all" ? [v] : undefined })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {stores.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>{t("minRevenue")}</Label>
                <Input
                  type="number"
                  value={filters.min_revenue ?? ""}
                  onChange={e => setFilters({ ...filters, min_revenue: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div>
                <Label>{t("maxRevenue")}</Label>
                <Input
                  type="number"
                  value={filters.max_revenue ?? ""}
                  onChange={e => setFilters({ ...filters, max_revenue: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div>
                <Label>{t("lastOrderAfter")}</Label>
                <Input
                  type="date"
                  value={filters.last_order_after || ""}
                  onChange={e => setFilters({ ...filters, last_order_after: e.target.value || undefined })}
                />
              </div>
              <div>
                <Label>{t("lastOrderBefore")}</Label>
                <Input
                  type="date"
                  value={filters.last_order_before || ""}
                  onChange={e => setFilters({ ...filters, last_order_before: e.target.value || undefined })}
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={handleCalculateSegment} disabled={calculatingSegment} variant="outline">
                <RefreshCw className={`mr-1 h-4 w-4 ${calculatingSegment ? "animate-spin" : ""}`} />
                {t("calculateRecipients")}
              </Button>
              {segmentCount !== null && (
                <span className="text-sm">
                  <Users className="inline h-4 w-4 mr-1" />
                  {segmentCount} {t("recipientCount")}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {(isSent || campaign.status === "sending") && (
        <Card>
          <CardHeader><CardTitle>{t("deliveryStats")}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-700">{pendingR}</p>
                <p className="text-sm text-muted-foreground">{t("pendingCount")}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-700">{sentR}</p>
                <p className="text-sm text-muted-foreground">{t("sentCount")}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-700">{deliveredR}</p>
                <p className="text-sm text-muted-foreground">{t("deliveredCount")}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-700">{failedR}</p>
                <p className="text-sm text-muted-foreground">{t("failedCount")}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-700">{bouncedR}</p>
                <p className="text-sm text-muted-foreground">{t("bouncedCount")}</p>
              </div>
            </div>
            {recipients.length > 0 && (
              <div className="mt-4 h-4 rounded-full bg-gray-100 overflow-hidden flex">
                {deliveredR > 0 && <div className="bg-green-500 h-full" style={{ width: `${(deliveredR / recipients.length) * 100}%` }} />}
                {sentR > 0 && <div className="bg-blue-500 h-full" style={{ width: `${(sentR / recipients.length) * 100}%` }} />}
                {failedR > 0 && <div className="bg-red-500 h-full" style={{ width: `${(failedR / recipients.length) * 100}%` }} />}
                {bouncedR > 0 && <div className="bg-orange-500 h-full" style={{ width: `${(bouncedR / recipients.length) * 100}%` }} />}
                {pendingR > 0 && <div className="bg-gray-300 h-full" style={{ width: `${(pendingR / recipients.length) * 100}%` }} />}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!isDraft && campaign.template && (
        <Card>
          <CardHeader><CardTitle>{t("samplePreview")}</CardTitle></CardHeader>
          <CardContent>
            {campaign.subject && <p className="font-medium mb-2">{t("subject")}: {campaign.subject}</p>}
            <div className="rounded border bg-muted/30 p-4 whitespace-pre-wrap text-sm">
              {campaign.template
                .replace(/\{\{customer_name\}\}/g, "Nguyễn Văn A")
                .replace(/\{\{store_name\}\}/g, "KFC Nguyễn Huệ")
                .replace(/\{\{event_date\}\}/g, "2026-05-01")}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("recipientList")} ({recipients.length})</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>{t("destination")}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>{t("sentAt")}</TableHead>
              <TableHead>{t("error")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recipients.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t("noRecipients")}</TableCell></TableRow>
            ) : recipients.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{(r.customer as { full_name?: string } | undefined)?.full_name || r.customer_id}</TableCell>
                <TableCell className="font-mono text-sm">{r.destination}</TableCell>
                <TableCell>
                  <Badge className={recipientStatusColors[r.status] || "bg-gray-100"}>{r.status}</Badge>
                </TableCell>
                <TableCell>{r.sent_at ? new Date(r.sent_at).toLocaleString() : "—"}</TableCell>
                <TableCell className="text-red-600 text-sm">{r.error || ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("sendCampaign")}</DialogTitle></DialogHeader>
          <p>{t("confirmSend", { count: recipients.length })}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>{t("cancelCampaign")}</Button>
            <Button onClick={handleSend}><Send className="mr-1 h-4 w-4" /> {t("send")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("scheduleCampaign")}</DialogTitle></DialogHeader>
          <div>
            <Label>{t("scheduledAt")}</Label>
            <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSchedule} disabled={!scheduledAt}>
              <Clock className="mr-1 h-4 w-4" /> {t("schedule")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("cancelCampaign")}</DialogTitle></DialogHeader>
          <p>{t("confirmCancel")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>No</Button>
            <Button variant="destructive" onClick={handleCancel}>{t("cancelCampaign")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
