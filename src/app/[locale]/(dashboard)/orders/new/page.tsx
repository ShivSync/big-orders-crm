"use client";

import { useEffect, useState, useCallback } from "react";
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
import { ArrowLeft, ArrowRight, Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import type {
  Store, IndividualCustomer, Organization, MenuItem, MenuCategory,
  EventType, OrderSource,
} from "@/types/database";

interface CartItem {
  menu_item_id: string;
  item_code: string;
  name_vi: string;
  name_en: string;
  price: number;
  quantity: number;
  special_requests: string;
}

const EVENT_TYPES: EventType[] = ["birthday", "corporate", "school_event", "meeting", "custom"];
const SOURCES: OrderSource[] = ["crm", "landing_page", "phone", "zalo", "facebook"];

const EVENT_I18N: Record<EventType, string> = {
  birthday: "eventBirthday",
  corporate: "eventCorporate",
  school_event: "eventSchool",
  meeting: "eventMeeting",
  custom: "eventCustom",
};

const SOURCE_I18N: Record<OrderSource, string> = {
  crm: "sourceCrm",
  landing_page: "sourceLandingPage",
  phone: "sourcePhone",
  zalo: "sourceZalo",
  facebook: "sourceFacebook",
  oms_migrated: "sourceOmsMigrated",
};

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

export default function NewOrderPage() {
  const t = useTranslations("orders");
  const tMenu = useTranslations("menu");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Reference data
  const [stores, setStores] = useState<Store[]>([]);
  const [customers, setCustomers] = useState<IndividualCustomer[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // Step 1: Customer & Store
  const [customerId, setCustomerId] = useState<string>("");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [storeId, setStoreId] = useState("");
  const [eventType, setEventType] = useState<EventType>("custom");
  const [scheduledDate, setScheduledDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [source, setSource] = useState<OrderSource>("crm");

  // Step 2: Menu items
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Step 3: Discount & notes
  const [discountPct, setDiscountPct] = useState(0);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function load() {
      const [storesRes, customersRes, orgsRes] = await Promise.all([
        supabase.from("stores").select("*").eq("active", true).order("name"),
        supabase.from("individual_customers").select("id, full_name, phone").is("deleted_at", null).order("full_name"),
        supabase.from("organizations").select("id, name_vi, name_en").is("deleted_at", null).order("name_vi"),
      ]);
      setStores(storesRes.data as Store[] ?? []);
      setCustomers(customersRes.data as IndividualCustomer[] ?? []);
      setOrganizations(orgsRes.data as Organization[] ?? []);

      const res = await fetch("/api/menu");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories ?? []);
        setMenuItems(data.items ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = Math.round(subtotal * discountPct / 100);
  const totalValue = subtotal - discountAmount;

  function addToCart(item: MenuItem) {
    const existing = cart.find(c => c.menu_item_id === item.id);
    if (existing) {
      setCart(cart.map(c =>
        c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      setCart([...cart, {
        menu_item_id: item.id,
        item_code: item.item_code,
        name_vi: item.name_vi,
        name_en: item.name_en,
        price: item.price,
        quantity: 1,
        special_requests: "",
      }]);
    }
  }

  function updateCartQty(menuItemId: string, delta: number) {
    setCart(cart.map(c => {
      if (c.menu_item_id !== menuItemId) return c;
      const newQty = c.quantity + delta;
      return newQty > 0 ? { ...c, quantity: newQty } : c;
    }).filter(c => c.quantity > 0));
  }

  function removeFromCart(menuItemId: string) {
    setCart(cart.filter(c => c.menu_item_id !== menuItemId));
  }

  const filteredMenuItems = categoryFilter === "all"
    ? menuItems
    : menuItems.filter(m => m.category_id === categoryFilter);

  function canProceed(s: number): boolean {
    if (s === 1) return !!(contactName.trim() && contactPhone.trim() && storeId && scheduledDate);
    if (s === 2) return cart.length > 0;
    return true;
  }

  async function handleSubmit(asDraft: boolean) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId || null,
          organization_id: organizationId || null,
          store_id: storeId,
          contact_name: contactName.trim(),
          contact_phone: contactPhone.trim(),
          event_type: eventType,
          scheduled_date: scheduledDate,
          guest_count: guestCount ? parseInt(guestCount) : null,
          source,
          discount_pct: discountPct,
          delivery_notes: deliveryNotes.trim() || null,
          notes: notes.trim() || null,
          status: asDraft ? "draft" : "confirmed",
          items: cart.map(c => ({
            menu_item_id: c.menu_item_id,
            quantity: c.quantity,
            special_requests: c.special_requests || null,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to create order");
        return;
      }

      const { data, needs_approval } = await res.json();
      toast.success(t("orderCreated"));
      if (needs_approval) {
        toast.info(t("approvalRequired"));
      }
      router.push(`/orders/${data.id}`);
    } catch {
      toast.error("Failed to create order");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">{tCommon("loading")}</p>;

  const STEPS = [
    t("wizardStep1"),
    t("wizardStep2"),
    t("wizardStep3"),
    t("wizardStep4"),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.push("/orders")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {tCommon("back")}
        </Button>
        <h1 className="text-2xl font-bold">{t("createOrder")}</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === i + 1 ? "bg-primary text-primary-foreground" :
              step > i + 1 ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
            }`}>
              {i + 1}
            </div>
            <span className={`text-sm hidden sm:inline ${step === i + 1 ? "font-medium" : "text-muted-foreground"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-muted-foreground/30" />}
          </div>
        ))}
      </div>

      {/* Step 1: Customer & Store */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>{t("wizardStep1")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t("selectCustomer")}</Label>
                <Select value={customerId} onValueChange={(v) => {
                  setCustomerId(v ?? "");
                  const cust = customers.find(c => c.id === v);
                  if (cust) {
                    setContactName(cust.full_name);
                    if (cust.phone) setContactPhone(cust.phone);
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder={t("selectCustomer")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- {t("enterContact")} --</SelectItem>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("organization")}</Label>
                <Select value={organizationId} onValueChange={(v) => setOrganizationId(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder={t("organization")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- --</SelectItem>
                    {organizations.map(o => (
                      <SelectItem key={o.id} value={o.id}>
                        {locale === "vi" ? o.name_vi : (o.name_en || o.name_vi)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t("contactName")} *</Label>
                <Input value={contactName} onChange={e => setContactName(e.target.value)} required />
              </div>
              <div>
                <Label>{t("contactPhone")} *</Label>
                <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>{t("store")} *</Label>
                <Select value={storeId} onValueChange={(v) => setStoreId(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder={t("selectStore")} /></SelectTrigger>
                  <SelectContent>
                    {stores.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("eventType")}</Label>
                <Select value={eventType} onValueChange={(v) => { if (v) setEventType(v as EventType); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(e => (
                      <SelectItem key={e} value={e}>{t(EVENT_I18N[e])}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("source")}</Label>
                <Select value={source} onValueChange={(v) => { if (v) setSource(v as OrderSource); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map(s => (
                      <SelectItem key={s} value={s}>{t(SOURCE_I18N[s])}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t("scheduledDate")} *</Label>
                <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} required />
              </div>
              <div>
                <Label>{t("guestCount")}</Label>
                <Input type="number" value={guestCount} onChange={e => setGuestCount(e.target.value)} min={1} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Menu Items */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t("browseMenu")}</CardTitle>
                  <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tMenu("allCategories")}</SelectItem>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {locale === "vi" ? c.name_vi : c.name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredMenuItems.map(item => {
                    const inCart = cart.find(c => c.menu_item_id === item.id);
                    return (
                      <div key={item.id} className="border rounded-lg p-3 flex justify-between items-center">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {locale === "vi" ? item.name_vi : item.name_en}
                          </p>
                          <p className="text-xs text-muted-foreground">{item.item_code}</p>
                          <p className="text-sm font-medium text-primary">{formatVND(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {inCart ? (
                            <>
                              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateCartQty(item.id, -1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm font-medium">{inCart.quantity}</span>
                              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateCartQty(item.id, 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => addToCart(item)}>
                              <Plus className="h-3 w-3 mr-1" />
                              {tMenu("addItem")}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cart sidebar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {cart.length} {t("itemsSelected")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("browseMenu")}</p>
              ) : (
                <>
                  {cart.map(item => (
                    <div key={item.menu_item_id} className="border rounded p-2 space-y-1">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium">
                          {locale === "vi" ? item.name_vi : item.name_en}
                        </p>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFromCart(item.menu_item_id)}>
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{item.quantity} x {formatVND(item.price)}</span>
                        <span className="font-medium">{formatVND(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>{t("subtotal")}</span>
                    <span>{formatVND(subtotal)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Review & Discount */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>{t("reviewOrder")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t("discountPct")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPct}
                  onChange={e => setDiscountPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                />
                {discountPct > 15 && (
                  <p className="text-xs text-yellow-600 mt-1">{t("approvalDiscount")}</p>
                )}
              </div>
              <div>
                <Label>{t("deliveryNotes")}</Label>
                <Textarea value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} rows={2} />
              </div>
            </div>
            <div>
              <Label>{t("notes")}</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>

            {/* Order summary */}
            <div className="border rounded-lg p-4 space-y-2">
              <h3 className="font-medium">{t("orderSummary")}</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>{t("contactName")}: {contactName}</span>
                  <span>{t("store")}: {stores.find(s => s.id === storeId)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("eventType")}: {t(EVENT_I18N[eventType])}</span>
                  <span>{t("scheduledDate")}: {scheduledDate}</span>
                </div>
              </div>
              <div className="border-t pt-2 space-y-1 text-sm">
                {cart.map(item => (
                  <div key={item.menu_item_id} className="flex justify-between">
                    <span>{item.quantity}x {locale === "vi" ? item.name_vi : item.name_en}</span>
                    <span>{formatVND(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{t("subtotal")}</span>
                  <span>{formatVND(subtotal)}</span>
                </div>
                {discountPct > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>{t("discount")} ({discountPct}%)</span>
                    <span>-{formatVND(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg">
                  <span>{t("totalValue")}</span>
                  <span>{formatVND(totalValue)}</span>
                </div>
                {totalValue > 50000000 && (
                  <p className="text-xs text-yellow-600">{t("approvalValue")}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <Card>
          <CardHeader><CardTitle>{t("confirmOrder")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {t("orderSummary")}: {cart.length} {t("itemsSelected")} — {formatVND(totalValue)}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleSubmit(true)}
                disabled={submitting}
              >
                {t("saveDraft")}
              </Button>
              <Button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
              >
                {t("confirmOrder")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {tCommon("back")}
        </Button>
        {step < 4 && (
          <Button
            onClick={() => setStep(s => s + 1)}
            disabled={!canProceed(step)}
          >
            <ArrowRight className="h-4 w-4 mr-1" />
            {step === 3 ? t("reviewOrder") : tCommon("confirm")}
          </Button>
        )}
      </div>
    </div>
  );
}
