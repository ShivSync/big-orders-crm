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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, Phone, Mail, MapPin, Building2, Save, Trash2, Plus, Link2,
  DollarSign, ShoppingCart, Calendar,
  PhoneCall, Video, StickyNote, Send, Settings2,
} from "lucide-react";
import type {
  IndividualCustomer, ContactType, Store, User, Activity, ActivityType,
  Organization, CustomerOrgLink, Gender, RecurringEvent, RecurringEventType,
} from "@/types/database";

const CONTACT_TYPES: ContactType[] = ["parent", "employee", "teacher", "event_organizer", "other"];
const ACTIVITY_TYPES: ActivityType[] = ["call", "email", "meeting", "note", "sms"];
const EVENT_TYPES: RecurringEventType[] = ["birthday", "company_anniversary", "children_day", "custom"];

const activityIcons: Record<ActivityType, typeof PhoneCall> = {
  call: PhoneCall, email: Mail, meeting: Video, note: StickyNote, sms: Send, system: Settings2,
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("customers");
  const tLeads = useTranslations("leads");
  const tEvents = useTranslations("events");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [customer, setCustomer] = useState<IndividualCustomer | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [activities, setActivities] = useState<(Activity & { creator?: Pick<User, "id" | "name" | "email"> | null })[]>([]);
  const [orgLinks, setOrgLinks] = useState<(CustomerOrgLink & { organization?: Organization })[]>([]);
  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [recurringEvents, setRecurringEvents] = useState<RecurringEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<IndividualCustomer>>({});

  const loadData = useCallback(async () => {
    const [custRes, storesRes, activitiesRes, linksRes, orgsRes, eventsRes] = await Promise.all([
      supabase.from("individual_customers").select("*").eq("id", id).single(),
      supabase.from("stores").select("*").eq("active", true),
      supabase.from("activities")
        .select("*, creator:users!activities_created_by_fkey(id, name, email)")
        .eq("entity_type", "customer")
        .eq("entity_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("customer_org_links")
        .select("*, organization:organizations(*)")
        .eq("individual_id", id),
      supabase.from("organizations").select("*").is("deleted_at", null),
      supabase.from("recurring_events")
        .select("*")
        .eq("customer_id", id)
        .is("deleted_at", null)
        .order("event_date"),
    ]);

    if (custRes.data) {
      setCustomer(custRes.data);
      setEditData(custRes.data);
    }
    setStores(storesRes.data ?? []);
    setActivities(activitiesRes.data ?? []);
    setOrgLinks(linksRes.data ?? []);
    setAllOrgs(orgsRes.data ?? []);
    setRecurringEvents(eventsRes.data ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSave() {
    if (!customer) return;
    const { error } = await supabase
      .from("individual_customers")
      .update({
        full_name: editData.full_name,
        phone: editData.phone,
        email: editData.email,
        contact_type: editData.contact_type,
        gender: editData.gender,
        dob: editData.dob,
        store_id: editData.store_id,
        city: editData.city,
        district: editData.district,
        ward: editData.ward,
        address: editData.address,
        consent_given: editData.consent_given,
        consent_date: editData.consent_given && !customer.consent_date ? new Date().toISOString() : editData.consent_date,
      })
      .eq("id", customer.id);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("customerUpdated"));
    setEditing(false);
    loadData();
  }

  async function handleDelete() {
    if (!customer || !confirm(tCommon("confirm"))) return;
    await supabase.from("individual_customers").update({ deleted_at: new Date().toISOString() }).eq("id", customer.id);
    router.push("/customers");
  }

  async function handleAddActivity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await supabase.from("activities").insert({
      entity_type: "customer",
      entity_id: id,
      activity_type: form.get("activity_type") as ActivityType,
      subject: form.get("subject") as string,
      description: (form.get("description") as string) || null,
    });
    setActivityDialogOpen(false);
    loadData();
  }

  async function handleLinkOrg(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const orgId = form.get("organization_id") as string;
    if (!orgId || orgId === "none") return;

    const { error } = await supabase.from("customer_org_links").insert({
      individual_id: id,
      organization_id: orgId,
      role_title: (form.get("role_title") as string) || null,
      is_primary_contact: form.get("is_primary_contact") === "on",
    });

    if (error) {
      toast.error(error.message);
      return;
    }
    setLinkDialogOpen(false);
    loadData();
  }

  async function handleUnlinkOrg(linkId: string) {
    await supabase.from("customer_org_links").delete().eq("id", linkId);
    loadData();
  }

  async function handleAddEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/recurring-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: id,
        event_type: form.get("event_type") as string,
        event_name: form.get("event_name") as string,
        event_date: form.get("event_date") as string,
        reminder_days_before: Number(form.get("reminder_days_before")) || 30,
      }),
    });
    if (res.ok) {
      setEventDialogOpen(false);
      loadData();
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm(tEvents("confirmDelete"))) return;
    await fetch(`/api/recurring-events/${eventId}`, { method: "DELETE" });
    loadData();
  }

  const eventTypeLabel = (et: RecurringEventType) => {
    const map: Record<RecurringEventType, string> = {
      birthday: "typeBirthday",
      company_anniversary: "typeCompanyAnniversary",
      children_day: "typeChildrenDay",
      custom: "typeCustom",
    };
    return tEvents(map[et]);
  };

  const contactTypeLabel = (ct: ContactType) => {
    const map: Record<ContactType, string> = {
      parent: "typeParent", employee: "typeEmployee", teacher: "typeTeacher",
      event_organizer: "typeEventOrganizer", other: "typeOther",
    };
    return t(map[ct]);
  };

  const activityLabel = (at: ActivityType) => {
    const map: Record<ActivityType, string> = {
      call: "activityCall", email: "activityEmail", meeting: "activityMeeting",
      note: "activityNote", sms: "activitySms", system: "activitySystem",
    };
    return tLeads(map[at]);
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-500">{tCommon("loading")}</div>;
  if (!customer) return <div className="flex items-center justify-center py-20 text-gray-500">{tCommon("noData")}</div>;

  const storeName = stores.find((s) => s.id === customer.store_id)?.name;
  const loc = locale === "vi" ? "vi-VN" : "en-US";
  const dateOpts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
  const dateTimeOpts: Intl.DateTimeFormatOptions = { ...dateOpts, hour: "2-digit", minute: "2-digit" };

  const linkedOrgIds = new Set(orgLinks.map((l) => l.organization_id));
  const availableOrgs = allOrgs.filter((o) => !linkedOrgIds.has(o.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/customers")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {tCommon("back")}
          </Button>
          <h1 className="text-2xl font-bold">{customer.full_name}</h1>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800`}>
            {contactTypeLabel(customer.contact_type)}
          </span>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setEditData(customer); }}>{tCommon("cancel")}</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={handleSave}>
                <Save className="h-4 w-4 mr-1" />{tCommon("save")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>{tCommon("edit")}</Button>
              <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-1" />{tCommon("delete")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-gray-500">{t("totalRevenue")}</p>
              <p className="text-xl font-bold text-green-600">₫{Number(customer.total_revenue).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500">{t("orderCount")}</p>
              <p className="text-xl font-bold text-blue-600">{customer.order_count}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-gray-500">{t("lastOrder")}</p>
              <p className="text-xl font-bold text-purple-600">
                {customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString(loc, dateOpts) : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Customer Info */}
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>{t("customerDetail")}</CardTitle></CardHeader>
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
                    <Label>{t("contactType")}</Label>
                    <Select value={editData.contact_type} onValueChange={(v) => setEditData({ ...editData, contact_type: v as ContactType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONTACT_TYPES.map((ct) => (
                          <SelectItem key={ct} value={ct}>{contactTypeLabel(ct)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("gender")}</Label>
                    <Select value={editData.gender || "none"} onValueChange={(v) => setEditData({ ...editData, gender: v === "none" ? null : v as Gender })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        <SelectItem value="M">{tLeads("genderM")}</SelectItem>
                        <SelectItem value="F">{tLeads("genderF")}</SelectItem>
                        <SelectItem value="Other">{tLeads("genderOther")}</SelectItem>
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
                    <Label>{t("city")}</Label>
                    <Input value={editData.city || ""} onChange={(e) => setEditData({ ...editData, city: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("district")}</Label>
                    <Input value={editData.district || ""} onChange={(e) => setEditData({ ...editData, district: e.target.value })} />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editData.consent_given || false}
                      onChange={(e) => setEditData({ ...editData, consent_given: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label>{t("consentGiven")}</Label>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{t("phone")}:</span>
                    <span className="text-sm font-medium">{customer.phone || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{t("email")}:</span>
                    <span className="text-sm font-medium">{customer.email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{t("contactType")}:</span>
                    <Badge variant="secondary">{contactTypeLabel(customer.contact_type)}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{t("store")}:</span>
                    <span className="text-sm font-medium">{storeName || "—"}</span>
                  </div>
                  {(customer.city || customer.district || customer.ward) && (
                    <div className="col-span-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">{t("address")}:</span>
                      <span className="text-sm">{[customer.address, customer.ward, customer.district, customer.city].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="text-sm text-gray-500">{t("consentGiven")}:</span>
                    <Badge variant={customer.consent_given ? "default" : "outline"}>
                      {customer.consent_given ? tCommon("yes") : tCommon("no")}
                    </Badge>
                  </div>
                  <div className="col-span-2 flex gap-6 text-xs text-gray-400 pt-2">
                    <span>{t("createdAt")}: {new Date(customer.created_at).toLocaleDateString(loc, dateOpts)}</span>
                    <span>{t("updatedAt")}: {new Date(customer.updated_at).toLocaleDateString(loc, dateOpts)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recurring Events */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{tEvents("title")}</CardTitle>
                <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
                  <DialogTrigger className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
                    <Plus className="h-3 w-3 mr-1" />
                    {tEvents("addEvent")}
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{tEvents("addEvent")}</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddEvent} className="space-y-4">
                      <div className="space-y-2">
                        <Label>{tEvents("eventType")}</Label>
                        <Select name="event_type" defaultValue="custom">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {EVENT_TYPES.map((et) => (
                              <SelectItem key={et} value={et}>{eventTypeLabel(et)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{tEvents("eventName")}</Label>
                        <Input name="event_name" required />
                      </div>
                      <div className="space-y-2">
                        <Label>{tEvents("eventDate")}</Label>
                        <Input name="event_date" type="date" required />
                      </div>
                      <div className="space-y-2">
                        <Label>{tEvents("reminderDays")}</Label>
                        <Input name="reminder_days_before" type="number" defaultValue={30} min={1} max={365} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setEventDialogOpen(false)}>{tCommon("cancel")}</Button>
                        <Button type="submit" className="bg-red-600 hover:bg-red-700">{tCommon("save")}</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {recurringEvents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">{tEvents("noEvents")}</p>
              ) : (
                <div className="space-y-3">
                  {recurringEvents.map((evt) => (
                    <div key={evt.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <p className="text-sm font-medium">{evt.event_name}</p>
                          <Badge variant="secondary" className="text-xs">{eventTypeLabel(evt.event_type)}</Badge>
                          {!evt.active && <Badge variant="outline" className="text-xs text-gray-400">{tEvents("inactive")}</Badge>}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>{tEvents("eventDate")}: {new Date(evt.event_date).toLocaleDateString(loc, dateOpts)}</span>
                          <span>{tEvents("reminderDays")}: {evt.reminder_days_before}d</span>
                          {evt.last_reminded_at && (
                            <span>{tEvents("lastReminded")}: {new Date(evt.last_reminded_at).toLocaleDateString(loc, dateOpts)}</span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteEvent(evt.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Organizations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t("linkedOrganizations")}</CardTitle>
                <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                  <DialogTrigger className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
                    <Link2 className="h-3 w-3 mr-1" />
                    {t("linkOrganization")}
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{t("linkOrganization")}</DialogTitle></DialogHeader>
                    <form onSubmit={handleLinkOrg} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Organization</Label>
                        <Select name="organization_id" defaultValue="none">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            {availableOrgs.map((o) => (
                              <SelectItem key={o.id} value={o.id}>{locale === "vi" ? o.name_vi : (o.name_en || o.name_vi)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("roleTitle")}</Label>
                        <Input name="role_title" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" name="is_primary_contact" className="h-4 w-4 rounded border-gray-300" />
                        <Label>{t("primaryContact")}</Label>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(false)}>{tCommon("cancel")}</Button>
                        <Button type="submit" className="bg-red-600 hover:bg-red-700">{tCommon("save")}</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {orgLinks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">{t("noOrganizations")}</p>
              ) : (
                <div className="space-y-3">
                  {orgLinks.map((link) => (
                    <div key={link.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => router.push(`/organizations/${link.organization_id}`)}
                      >
                        <Building2 className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">
                            {locale === "vi" ? link.organization?.name_vi : (link.organization?.name_en || link.organization?.name_vi)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {link.role_title && <span className="text-xs text-gray-500">{link.role_title}</span>}
                            {link.is_primary_contact && <Badge variant="secondary" className="text-xs">{t("primaryContact")}</Badge>}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleUnlinkOrg(link.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{tLeads("activityTimeline")}</CardTitle>
                <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
                  <DialogTrigger className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
                    <Plus className="h-3 w-3 mr-1" />
                    {tLeads("addActivity")}
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{tLeads("addActivity")}</DialogTitle></DialogHeader>
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
                        <Label>{tLeads("activitySubject")}</Label>
                        <Input name="subject" required />
                      </div>
                      <div className="space-y-2">
                        <Label>{tLeads("activityDescription")}</Label>
                        <textarea name="description" rows={3} className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setActivityDialogOpen(false)}>{tCommon("cancel")}</Button>
                        <Button type="submit" className="bg-red-600 hover:bg-red-700">{tCommon("save")}</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">{tLeads("noActivities")}</p>
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
                          {activity.subject && <p className="text-sm font-medium mt-1">{activity.subject}</p>}
                          {activity.description && <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>}
                          {activity.creator && <p className="text-xs text-gray-400 mt-1">{activity.creator.name || activity.creator.email}</p>}
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
