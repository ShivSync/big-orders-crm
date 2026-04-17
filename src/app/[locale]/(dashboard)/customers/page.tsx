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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, Eye, DollarSign, Users, ShoppingCart, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import { LocationCascader } from "@/components/ui/location-cascader";
import { RequiredLabel } from "@/components/ui/required-label";
import { maskPhone } from "@/lib/pii-mask";
import type { IndividualCustomer, ContactType, Store } from "@/types/database";

function sanitizeSearch(input: string): string {
  return input.replace(/[%_\\(),.*]/g, "").trim();
}

const CONTACT_TYPES: ContactType[] = ["parent", "employee", "teacher", "event_organizer", "other"];

const contactTypeColors: Record<ContactType, string> = {
  parent: "bg-blue-100 text-blue-800",
  employee: "bg-green-100 text-green-800",
  teacher: "bg-purple-100 text-purple-800",
  event_organizer: "bg-orange-100 text-orange-800",
  other: "bg-gray-100 text-gray-800",
};

export default function CustomersPage() {
  const t = useTranslations("customers");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [customers, setCustomers] = useState<(IndividualCustomer & { store?: Store | null })[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [filterType, setFilterType] = useState<string>("all");
  const [filterStore, setFilterStore] = useState<string>("all");
  const [filterCity, setFilterCity] = useState<string>("all");

  const [formStoreId, setFormStoreId] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formDistrict, setFormDistrict] = useState("");
  const [formWard, setFormWard] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("individual_customers")
      .select("*, store:stores(*)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (filterType !== "all") query = query.eq("contact_type", filterType);
    if (filterStore !== "all") query = query.eq("store_id", filterStore);
    if (filterCity !== "all") query = query.eq("city", filterCity);
    const cleaned = sanitizeSearch(searchQuery);
    if (cleaned) {
      query = query.or(`full_name.ilike.%${cleaned}%,phone.ilike.%${cleaned}%,email.ilike.%${cleaned}%`);
    }

    const [customersRes, storesRes] = await Promise.all([
      query,
      supabase.from("stores").select("*").eq("active", true),
    ]);

    setCustomers(customersRes.data ?? []);
    setStores(storesRes.data ?? []);
    setLoading(false);
  }, [filterType, filterStore, filterCity, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const phone = (form.get("phone") as string) || null;

    if (phone) {
      const { data: existing } = await supabase
        .from("individual_customers")
        .select("id")
        .eq("phone", phone)
        .is("deleted_at", null)
        .limit(1);
      if (existing && existing.length > 0) {
        toast.error(t("duplicatePhone"));
        return;
      }
    }

    const data = {
      full_name: form.get("full_name") as string,
      phone,
      email: (form.get("email") as string) || null,
      contact_type: form.get("contact_type") as ContactType,
      store_id: formStoreId || null,
      city: formCity || null,
      district: formDistrict || null,
      ward: formWard || null,
      address: (form.get("address") as string) || null,
      consent_given: form.get("consent_given") === "on",
      consent_date: form.get("consent_given") === "on" ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from("individual_customers").insert(data);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("customerCreated"));
    setDialogOpen(false);
    loadData();
  }

  const contactTypeLabel = (ct: ContactType) => {
    const map: Record<ContactType, string> = {
      parent: "typeParent", employee: "typeEmployee", teacher: "typeTeacher",
      event_organizer: "typeEventOrganizer", other: "typeOther",
    };
    return t(map[ct]);
  };

  const totalCustomers = customers.length;
  const withOrders = customers.filter((c) => c.order_count > 0).length;
  const totalRevenue = customers.reduce((sum, c) => sum + Number(c.total_revenue), 0);
  const now = new Date();
  const newThisMonth = customers.filter((c) => {
    const d = new Date(c.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const cities = [...new Set(customers.map((c) => c.city).filter(Boolean))] as string[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
            <Plus className="mr-2 h-4 w-4" />
            {t("createCustomer")}
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("createCustomer")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <RequiredLabel required>{t("fullName")}</RequiredLabel>
                  <Input name="full_name" required />
                </div>
                <div className="space-y-2">
                  <RequiredLabel>{t("phone")}</RequiredLabel>
                  <Input name="phone" placeholder="+84..." />
                </div>
                <div className="space-y-2">
                  <RequiredLabel>{t("email")}</RequiredLabel>
                  <Input name="email" type="email" />
                </div>
                <div className="space-y-2">
                  <RequiredLabel required>{t("contactType")}</RequiredLabel>
                  <Select name="contact_type" defaultValue="other">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONTACT_TYPES.map((ct) => (
                        <SelectItem key={ct} value={ct}>{contactTypeLabel(ct)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <RequiredLabel>{t("store")}</RequiredLabel>
                  <Combobox
                    options={stores.map(s => ({ value: s.id, label: s.name }))}
                    value={formStoreId}
                    onChange={setFormStoreId}
                    placeholder={t("store")}
                  />
                </div>
                <div className="col-span-2">
                  <LocationCascader
                    city={formCity}
                    district={formDistrict}
                    ward={formWard}
                    onCityChange={setFormCity}
                    onDistrictChange={setFormDistrict}
                    onWardChange={setFormWard}
                    cityLabel={t("city")}
                    districtLabel={t("district")}
                    wardLabel={t("ward")}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <RequiredLabel>{t("address")}</RequiredLabel>
                  <Input name="address" />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" name="consent_given" id="consent_given" className="h-4 w-4 rounded border-gray-300" />
                  <Label htmlFor="consent_given">{t("consentGiven")}</Label>
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

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: t("totalCustomers"), value: totalCustomers, icon: Users, color: "text-gray-900" },
          { label: t("withOrders"), value: withOrders, icon: ShoppingCart, color: "text-blue-600" },
          { label: t("totalCustomerRevenue"), value: `₫${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-green-600" },
          { label: t("newThisMonth"), value: newThisMonth, icon: TrendingUp, color: "text-purple-600" },
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
          <SelectTrigger className="w-44"><SelectValue placeholder={t("contactType")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("all")}</SelectItem>
            {CONTACT_TYPES.map((ct) => (
              <SelectItem key={ct} value={ct}>{contactTypeLabel(ct)}</SelectItem>
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
                <TableHead>{t("fullName")}</TableHead>
                <TableHead>{t("phone")}</TableHead>
                <TableHead>{t("contactType")}</TableHead>
                <TableHead>{t("city")}</TableHead>
                <TableHead>{t("store")}</TableHead>
                <TableHead>{t("orderCount")}</TableHead>
                <TableHead>{t("totalRevenue")}</TableHead>
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
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    {tCommon("noData")}
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id} className="cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/customers/${customer.id}`)}>
                    <TableCell className="font-medium">{customer.full_name}</TableCell>
                    <TableCell>{customer.phone ? maskPhone(customer.phone) : "—"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${contactTypeColors[customer.contact_type]}`}>
                        {contactTypeLabel(customer.contact_type)}
                      </span>
                    </TableCell>
                    <TableCell>{customer.city || "—"}</TableCell>
                    <TableCell>{customer.store?.name || "—"}</TableCell>
                    <TableCell>{customer.order_count}</TableCell>
                    <TableCell>₫{Number(customer.total_revenue).toLocaleString()}</TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {new Date(customer.created_at).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/customers/${customer.id}`); }}>
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
