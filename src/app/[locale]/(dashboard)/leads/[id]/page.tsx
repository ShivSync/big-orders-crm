"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, Phone, Mail, MapPin, Building2, Calendar,
  MessageSquare, PhoneCall, Video, StickyNote, Send, Settings2,
  Save, Trash2, Plus, UserPlus,
} from "lucide-react";
import type {
  Lead, LeadStage, LeadType, LeadSource, Store, User, Activity, ActivityType, Gender,
} from "@/types/database";

const STAGES: LeadStage[] = ["new", "contacted", "qualified", "converted", "lost"];
const LEAD_TYPES: LeadType[] = ["individual", "parent", "school", "company"];
const LEAD_SOURCES: LeadSource[] = ["manual", "event", "campaign", "platform", "web_app", "company_school", "google_maps", "oms_sync"];
const ACTIVITY_TYPES: ActivityType[] = ["call", "email", "meeting", "note", "sms"];

const stageColors: Record<LeadStage, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  contacted: "bg-yellow-100 text-yellow-800 border-yellow-200",
  qualified: "bg-green-100 text-green-800 border-green-200",
  converted: "bg-purple-100 text-purple-800 border-purple-200",
  lost: "bg-gray-100 text-gray-800 border-gray-200",
};

const activityIcons: Record<ActivityType, typeof PhoneCall> = {
  call: PhoneCall,
  email: Mail,
  meeting: Video,
  note: StickyNote,
  sms: Send,
  system: Settings2,
};

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("leads");
  const tCustomers = useTranslations("customers");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [lead, setLead] = useState<Lead | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<Pick<User, "id" | "name" | "email">[]>([]);
  const [activities, setActivities] = useState<(Activity & { creator?: Pick<User, "id" | "name" | "email"> | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);

  // Edit form state
  const [editData, setEditData] = useState<Partial<Lead>>({});

  const loadData = useCallback(async () => {
    const [leadRes, storesRes, usersRes, activitiesRes] = await Promise.all([
      supabase.from("leads").select("*").eq("id", id).single(),
      supabase.from("stores").select("*").eq("active", true),
      supabase.from("users").select("id, name, email").eq("status", "active"),
      supabase.from("activities")
        .select("*, creator:users!activities_created_by_fkey(id, name, email)")
        .eq("entity_type", "lead")
        .eq("entity_id", id)
        .order("created_at", { ascending: false }),
    ]);

    if (leadRes.data) {
      setLead(leadRes.data);
      setEditData(leadRes.data);
    }
    setStores(storesRes.data ?? []);
    setUsers(usersRes.data ?? []);
    setActivities(activitiesRes.data ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSave() {
    if (!lead) return;
    const { error } = await supabase
      .from("leads")
      .update({
        full_name: editData.full_name,
        phone: editData.phone,
        email: editData.email,
        gender: editData.gender,
        dob: editData.dob,
        lead_type: editData.lead_type,
        lead_source: editData.lead_source,
        store_id: editData.store_id,
        assigned_to: editData.assigned_to,
        city: editData.city,
        district: editData.district,
        ward: editData.ward,
        address: editData.address,
        notes: editData.notes,
      })
      .eq("id", lead.id);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("leadUpdated"));
    setEditing(false);
    loadData();
  }

  async function handleStageChange(newStage: LeadStage) {
    if (!lead) return;
    const oldStage = lead.stage;
    await supabase.from("leads").update({ stage: newStage }).eq("id", lead.id);

    await supabase.from("activities").insert({
      entity_type: "lead",
      entity_id: lead.id,
      activity_type: "system",
      subject: `Stage changed: ${oldStage} → ${newStage}`,
    });

    loadData();
  }

  async function handleDelete() {
    if (!lead || !confirm(t("confirmDelete"))) return;
    await supabase.from("leads").update({ deleted_at: new Date().toISOString() }).eq("id", lead.id);
    router.push("/leads");
  }

  async function handleConvertToCustomer() {
    if (!lead || !confirm(tCustomers("convertConfirm"))) return;

    const res = await fetch(`/api/leads/${lead.id}/convert`, { method: "POST" });
    const body = await res.json();

    if (!res.ok) {
      if (res.status === 409) {
        toast.error(tCustomers("duplicatePhone"));
      } else {
        toast.error(body.error || "Conversion failed");
      }
      return;
    }

    toast.success(tCustomers("convertSuccess"));
    router.push(`/customers/${body.data.customerId}`);
  }

  async function handleAddActivity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    await supabase.from("activities").insert({
      entity_type: "lead",
      entity_id: id,
      activity_type: form.get("activity_type") as ActivityType,
      subject: form.get("subject") as string,
      description: form.get("description") as string || null,
    });

    setActivityDialogOpen(false);
    loadData();
  }

  const stageLabel = (s: LeadStage) => {
    const map: Record<LeadStage, string> = {
      new: "stageNew", contacted: "stageContacted", qualified: "stageQualified",
      converted: "stageConverted", lost: "stageLost",
    };
    return t(map[s]);
  };

  const typeLabel = (lt: LeadType) => {
    const map: Record<LeadType, string> = {
      individual: "typeIndividual", parent: "typeParent", school: "typeSchool", company: "typeCompany",
    };
    return t(map[lt]);
  };

  const sourceLabel = (ls: LeadSource) => {
    const map: Record<LeadSource, string> = {
      manual: "sourceManual", event: "sourceEvent", campaign: "sourceCampaign", platform: "sourcePlatform",
      web_app: "sourceWebApp", company_school: "sourceCompanySchool", google_maps: "sourceGoogleMaps", oms_sync: "sourceOmsSync",
    };
    return t(map[ls]);
  };

  const activityLabel = (at: ActivityType) => {
    const map: Record<ActivityType, string> = {
      call: "activityCall", email: "activityEmail", meeting: "activityMeeting",
      note: "activityNote", sms: "activitySms", system: "activitySystem",
    };
    return t(map[at]);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-500">{tCommon("loading")}</div>;
  }

  if (!lead) {
    return <div className="flex items-center justify-center py-20 text-gray-500">{tCommon("noData")}</div>;
  }

  const storeName = stores.find((s) => s.id === lead.store_id)?.name;
  const assignedUser = users.find((u) => u.id === lead.assigned_to);
  const dateOpts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
  const dateTimeOpts: Intl.DateTimeFormatOptions = { ...dateOpts, hour: "2-digit", minute: "2-digit" };
  const loc = locale === "vi" ? "vi-VN" : "en-US";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/leads")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {tCommon("back")}
          </Button>
          <h1 className="text-2xl font-bold">{lead.full_name}</h1>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${stageColors[lead.stage]}`}>
            {stageLabel(lead.stage)}
          </span>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setEditData(lead); }}>
                {tCommon("cancel")}
              </Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={handleSave}>
                <Save className="h-4 w-4 mr-1" />
                {tCommon("save")}
              </Button>
            </>
          ) : (
            <>
              {(lead.stage === "qualified" || lead.stage === "contacted") && (
                <Button className="bg-green-600 hover:bg-green-700" onClick={handleConvertToCustomer}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  {tCustomers("convertFromLead")}
                </Button>
              )}
              <Button variant="outline" onClick={() => setEditing(true)}>
                {tCommon("edit")}
              </Button>
              <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-1" />
                {t("deleteLead")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stage Pipeline */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-1">
            {STAGES.map((s, i) => (
              <button
                key={s}
                onClick={() => handleStageChange(s)}
                className={`flex-1 py-2 text-center text-sm font-medium rounded transition-colors ${
                  s === lead.stage
                    ? stageColors[s]
                    : STAGES.indexOf(lead.stage) > i
                      ? "bg-gray-200 text-gray-600"
                      : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                }`}
              >
                {stageLabel(s)}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        {/* Lead Info */}
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("leadDetail")}</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("fullName")} *</Label>
                    <Input value={editData.full_name || ""} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("phone")}</Label>
                    <Input value={editData.phone || ""} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("email")}</Label>
                    <Input value={editData.email || ""} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("gender")}</Label>
                    <Select value={editData.gender || "none"} onValueChange={(v) => setEditData({ ...editData, gender: v === "none" ? null : v as Gender })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        <SelectItem value="M">{t("genderM")}</SelectItem>
                        <SelectItem value="F">{t("genderF")}</SelectItem>
                        <SelectItem value="Other">{t("genderOther")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("leadType")}</Label>
                    <Select value={editData.lead_type} onValueChange={(v) => setEditData({ ...editData, lead_type: v as LeadType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEAD_TYPES.map((lt) => (
                          <SelectItem key={lt} value={lt}>{typeLabel(lt)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("leadSource")}</Label>
                    <Select value={editData.lead_source} onValueChange={(v) => setEditData({ ...editData, lead_source: v as LeadSource })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEAD_SOURCES.map((ls) => (
                          <SelectItem key={ls} value={ls}>{sourceLabel(ls)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("store")}</Label>
                    <Select value={editData.store_id || "none"} onValueChange={(v) => setEditData({ ...editData, store_id: v === "none" ? null : v })}>
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
                    <Select value={editData.assigned_to || "none"} onValueChange={(v) => setEditData({ ...editData, assigned_to: v === "none" ? null : v })}>
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
                    <Input value={editData.city || ""} onChange={(e) => setEditData({ ...editData, city: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("district")}</Label>
                    <Input value={editData.district || ""} onChange={(e) => setEditData({ ...editData, district: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("ward")}</Label>
                    <Input value={editData.ward || ""} onChange={(e) => setEditData({ ...editData, ward: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("address")}</Label>
                    <Input value={editData.address || ""} onChange={(e) => setEditData({ ...editData, address: e.target.value })} />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>{t("notes")}</Label>
                    <Textarea value={editData.notes || ""} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} rows={3} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{t("phone")}:</span>
                    <span className="text-sm font-medium">{lead.phone || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{t("email")}:</span>
                    <span className="text-sm font-medium">{lead.email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{t("leadType")}:</span>
                    <Badge variant="secondary">{typeLabel(lead.lead_type)}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{t("leadSource")}:</span>
                    <Badge variant="outline">{sourceLabel(lead.lead_source)}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{t("store")}:</span>
                    <span className="text-sm font-medium">{storeName || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{t("assignedTo")}:</span>
                    <span className="text-sm font-medium">{assignedUser?.name || "—"}</span>
                  </div>
                  {(lead.city || lead.district || lead.ward) && (
                    <div className="col-span-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">{t("address")}:</span>
                      <span className="text-sm">{[lead.address, lead.ward, lead.district, lead.city].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                  {lead.notes && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500 mb-1">{t("notes")}:</p>
                      <p className="text-sm bg-gray-50 rounded p-3">{lead.notes}</p>
                    </div>
                  )}
                  <div className="col-span-2 flex gap-6 text-xs text-gray-400 pt-2">
                    <span>{t("createdAt")}: {new Date(lead.created_at).toLocaleDateString(loc, dateOpts)}</span>
                    <span>{t("updatedAt")}: {new Date(lead.updated_at).toLocaleDateString(loc, dateOpts)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline (right column) */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t("activityTimeline")}</CardTitle>
                <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
                  <DialogTrigger className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
                    <Plus className="h-3 w-3 mr-1" />
                    {t("addActivity")}
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("addActivity")}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddActivity} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select name="activity_type" defaultValue="note">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ACTIVITY_TYPES.map((at) => (
                              <SelectItem key={at} value={at}>{activityLabel(at)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("activitySubject")}</Label>
                        <Input name="subject" required />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("activityDescription")}</Label>
                        <Textarea name="description" rows={3} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setActivityDialogOpen(false)}>
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
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">{t("noActivities")}</p>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => {
                    const Icon = activityIcons[activity.activity_type] || Settings2;
                    return (
                      <div key={activity.id} className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                            <Icon className="h-3.5 w-3.5 text-gray-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{activityLabel(activity.activity_type)}</Badge>
                            <span className="text-xs text-gray-400">
                              {new Date(activity.created_at).toLocaleDateString(loc, dateTimeOpts)}
                            </span>
                          </div>
                          {activity.subject && (
                            <p className="text-sm font-medium mt-1">{activity.subject}</p>
                          )}
                          {activity.description && (
                            <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
                          )}
                          {activity.creator && (
                            <p className="text-xs text-gray-400 mt-1">
                              {activity.creator.name || activity.creator.email}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
