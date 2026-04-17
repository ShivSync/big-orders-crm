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
  ArrowLeft, Phone, Mail, MapPin, Globe, Building2, Save, Trash2, Plus, Link2, Users,
  DollarSign, ShoppingCart, Calendar,
  PhoneCall, Video, StickyNote, Send, Settings2,
} from "lucide-react";
import type {
  Organization, OrganizationType, OrgSize, Store, User, Activity, ActivityType,
  IndividualCustomer, CustomerOrgLink,
} from "@/types/database";

const ORG_TYPES: OrganizationType[] = ["company", "school", "university", "hotel", "club", "government_office", "event_venue", "other"];
const ORG_SIZES: OrgSize[] = ["small", "medium", "large", "enterprise"];
const INDUSTRIES = ["education", "hospitality", "technology", "corporate", "retail", "government", "healthcare", "entertainment", "other"];
const ACTIVITY_TYPES: ActivityType[] = ["call", "email", "meeting", "note", "sms"];

const activityIcons: Record<ActivityType, typeof PhoneCall> = {
  call: PhoneCall, email: Mail, meeting: Video, note: StickyNote, sms: Send, system: Settings2,
};

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("organizations");
  const tLeads = useTranslations("leads");
  const tCustomers = useTranslations("customers");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [org, setOrg] = useState<Organization | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [activities, setActivities] = useState<(Activity & { creator?: Pick<User, "id" | "name" | "email"> | null })[]>([]);
  const [contactLinks, setContactLinks] = useState<(CustomerOrgLink & { individual?: IndividualCustomer })[]>([]);
  const [allCustomers, setAllCustomers] = useState<IndividualCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<Organization>>({});

  const loadData = useCallback(async () => {
    const [orgRes, storesRes, activitiesRes, linksRes, customersRes] = await Promise.all([
      supabase.from("organizations").select("*").eq("id", id).single(),
      supabase.from("stores").select("*").eq("active", true),
      supabase.from("activities")
        .select("*, creator:users!activities_created_by_fkey(id, name, email)")
        .eq("entity_type", "customer")
        .eq("entity_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("customer_org_links")
        .select("*, individual:individual_customers(*)")
        .eq("organization_id", id),
      supabase.from("individual_customers").select("*").is("deleted_at", null),
    ]);

    if (orgRes.data) {
      setOrg(orgRes.data);
      setEditData(orgRes.data);
    }
    setStores(storesRes.data ?? []);
    setActivities(activitiesRes.data ?? []);
    setContactLinks(linksRes.data ?? []);
    setAllCustomers(customersRes.data ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSave() {
    if (!org) return;
    const { error } = await supabase
      .from("organizations")
      .update({
        name_vi: editData.name_vi,
        name_en: editData.name_en,
        tax_id: editData.tax_id,
        organization_type: editData.organization_type,
        industry: editData.industry,
        size: editData.size,
        store_id: editData.store_id,
        city: editData.city,
        district: editData.district,
        ward: editData.ward,
        address: editData.address,
        website: editData.website,
        main_phone: editData.main_phone,
        main_email: editData.main_email,
      })
      .eq("id", org.id);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("orgUpdated"));
    setEditing(false);
    loadData();
  }

  async function handleDelete() {
    if (!org || !confirm(tCommon("confirm"))) return;
    await supabase.from("organizations").update({ deleted_at: new Date().toISOString() }).eq("id", org.id);
    router.push("/organizations");
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

  async function handleLinkContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const custId = form.get("individual_id") as string;
    if (!custId || custId === "none") return;

    const { error } = await supabase.from("customer_org_links").insert({
      individual_id: custId,
      organization_id: id,
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

  async function handleUnlinkContact(linkId: string) {
    await supabase.from("customer_org_links").delete().eq("id", linkId);
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
    const map: Record<OrgSize, string> = { small: "sizeSmall", medium: "sizeMedium", large: "sizeLarge", enterprise: "sizeEnterprise" };
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

  const activityLabel = (at: ActivityType) => {
    const map: Record<ActivityType, string> = {
      call: "activityCall", email: "activityEmail", meeting: "activityMeeting",
      note: "activityNote", sms: "activitySms", system: "activitySystem",
    };
    return tLeads(map[at]);
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-500">{tCommon("loading")}</div>;
  if (!org) return <div className="flex items-center justify-center py-20 text-gray-500">{tCommon("noData")}</div>;

  const storeName = stores.find((s) => s.id === org.store_id)?.name;
  const loc = locale === "vi" ? "vi-VN" : "en-US";
  const dateOpts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
  const dateTimeOpts: Intl.DateTimeFormatOptions = { ...dateOpts, hour: "2-digit", minute: "2-digit" };
  const displayName = locale === "vi" ? org.name_vi : (org.name_en || org.name_vi);

  const linkedCustIds = new Set(contactLinks.map((l) => l.individual_id));
  const availableCustomers = allCustomers.filter((c) => !linkedCustIds.has(c.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/organizations")}>
            <ArrowLeft className="h-4 w-4 mr-1" />{tCommon("back")}
          </Button>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800`}>
            {orgTypeLabel(org.organization_type)}
          </span>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setEditData(org); }}>{tCommon("cancel")}</Button>
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

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-gray-500">{t("totalRevenue")}</p>
              <p className="text-xl font-bold text-green-600">₫{Number(org.total_revenue).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500">{t("orderCount")}</p>
              <p className="text-xl font-bold text-blue-600">{org.order_count}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-gray-500">{t("linkedContacts")}</p>
              <p className="text-xl font-bold text-purple-600">{contactLinks.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>{t("orgDetail")}</CardTitle></CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("nameVi")} *</Label>
                    <Input value={editData.name_vi || ""} onChange={(e) => setEditData({ ...editData, name_vi: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("nameEn")}</Label>
                    <Input value={editData.name_en || ""} onChange={(e) => setEditData({ ...editData, name_en: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("taxId")}</Label>
                    <Input value={editData.tax_id || ""} onChange={(e) => setEditData({ ...editData, tax_id: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("orgType")}</Label>
                    <Select value={editData.organization_type} onValueChange={(v) => setEditData({ ...editData, organization_type: v as OrganizationType })}>
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
                    <Select value={editData.industry || "none"} onValueChange={(v) => setEditData({ ...editData, industry: v === "none" ? null : v })}>
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
                    <Select value={editData.size || "none"} onValueChange={(v) => setEditData({ ...editData, size: v === "none" ? null : v as OrgSize })}>
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
                    <Label>{t("mainPhone")}</Label>
                    <Input value={editData.main_phone || ""} onChange={(e) => setEditData({ ...editData, main_phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("mainEmail")}</Label>
                    <Input value={editData.main_email || ""} onChange={(e) => setEditData({ ...editData, main_email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("website")}</Label>
                    <Input value={editData.website || ""} onChange={(e) => setEditData({ ...editData, website: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("city")}</Label>
                    <Input value={editData.city || ""} onChange={(e) => setEditData({ ...editData, city: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("district")}</Label>
                    <Input value={editData.district || ""} onChange={(e) => setEditData({ ...editData, district: e.target.value })} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                  {org.tax_id && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{t("taxId")}:</span>
                      <span className="text-sm font-medium">{org.tax_id}</span>
                    </div>
                  )}
                  {org.industry && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{t("industry")}:</span>
                      <Badge variant="secondary">{industryLabel(org.industry)}</Badge>
                    </div>
                  )}
                  {org.size && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{t("size")}:</span>
                      <Badge variant="outline">{sizeLabel(org.size)}</Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{t("mainPhone")}:</span>
                    <span className="text-sm font-medium">{org.main_phone || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{t("mainEmail")}:</span>
                    <span className="text-sm font-medium">{org.main_email || "—"}</span>
                  </div>
                  {org.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">{t("website")}:</span>
                      <span className="text-sm font-medium">{org.website}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{t("store")}:</span>
                    <span className="text-sm font-medium">{storeName || "—"}</span>
                  </div>
                  {(org.city || org.district || org.ward) && (
                    <div className="col-span-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">{t("address")}:</span>
                      <span className="text-sm">{[org.address, org.ward, org.district, org.city].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                  <div className="col-span-2 flex gap-6 text-xs text-gray-400 pt-2">
                    <span>{t("createdAt")}: {new Date(org.created_at).toLocaleDateString(loc, dateOpts)}</span>
                    <span>{t("updatedAt")}: {new Date(org.updated_at).toLocaleDateString(loc, dateOpts)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Contacts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t("linkedContacts")}</CardTitle>
                <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                  <DialogTrigger className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
                    <Link2 className="h-3 w-3 mr-1" />
                    {t("linkContact")}
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{t("linkContact")}</DialogTitle></DialogHeader>
                    <form onSubmit={handleLinkContact} className="space-y-4">
                      <div className="space-y-2">
                        <Label>{tCustomers("fullName")}</Label>
                        <Select name="individual_id" defaultValue="none">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            {availableCustomers.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.full_name} {c.phone ? `(${c.phone})` : ""}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{tCustomers("roleTitle")}</Label>
                        <Input name="role_title" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" name="is_primary_contact" className="h-4 w-4 rounded border-gray-300" />
                        <Label>{tCustomers("primaryContact")}</Label>
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
              {contactLinks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">{t("noContacts")}</p>
              ) : (
                <div className="space-y-3">
                  {contactLinks.map((link) => (
                    <div key={link.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => router.push(`/customers/${link.individual_id}`)}
                      >
                        <Users className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">{link.individual?.full_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {link.individual?.phone && <span className="text-xs text-gray-500">{link.individual.phone}</span>}
                            {link.role_title && <span className="text-xs text-gray-500">• {link.role_title}</span>}
                            {link.is_primary_contact && <Badge variant="secondary" className="text-xs">{tCustomers("primaryContact")}</Badge>}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleUnlinkContact(link.id)}>
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
