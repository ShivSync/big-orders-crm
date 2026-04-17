"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PartyPopper, Phone, Users, UtensilsCrossed, MapPin, ChevronDown } from "lucide-react";
import { ChatWidget } from "./chat-widget";

const EVENT_TYPES = ["birthday", "corporate", "school", "wedding", "other"] as const;

export default function BookPartyPage() {
  const t = useTranslations("landing");
  const [form, setForm] = useState({
    name: "", phone: "", event_type: "", guest_count: "", preferred_date: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    const res = await fetch("/api/leads/public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setResult(res.ok ? "success" : "error");
    setSubmitting(false);
    if (res.ok) {
      setForm({ name: "", phone: "", event_type: "", guest_count: "", preferred_date: "", notes: "" });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-red-600 text-white shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-white text-xs font-bold text-red-600">
              KFC
            </div>
            <span className="text-lg font-bold">Big Orders</span>
          </div>
          <a href="#booking-form" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50">
            {t("bookNow")}
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-red-600 via-red-500 to-red-700 px-4 py-20 text-center text-white">
        <div className="mx-auto max-w-3xl">
          <PartyPopper className="mx-auto mb-6 h-16 w-16 opacity-90" />
          <h1 className="mb-4 text-4xl font-extrabold leading-tight md:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="mb-8 text-lg opacity-90 md:text-xl">
            {t("heroSubtitle")}
          </p>
          <a
            href="#booking-form"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-lg font-bold text-red-600 shadow-lg transition hover:bg-red-50"
          >
            {t("bookNow")}
            <ChevronDown className="h-5 w-5" />
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 px-4 py-16">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          <FeatureCard icon={<Users className="h-8 w-8 text-red-600" />} title="20 - 500" subtitle={t("guests")} />
          <FeatureCard icon={<UtensilsCrossed className="h-8 w-8 text-red-600" />} title="89,000đ" subtitle={t("perPerson")} />
          <FeatureCard icon={<MapPin className="h-8 w-8 text-red-600" />} title="260+" subtitle="stores" />
        </div>
      </section>

      {/* Menu showcase */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center text-3xl font-bold text-gray-900">
            <UtensilsCrossed className="mr-2 inline h-8 w-8 text-red-600" />
            {t("menuShowcase")}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <MenuCard name="Combo Gà Rán" desc="8 miếng gà + 2 Pepsi + Khoai tây" price="289,000đ" />
            <MenuCard name="Combo Burger" desc="4 Burger + 4 Pepsi + Coleslaw" price="359,000đ" />
            <MenuCard name="Combo Tiệc Lớn" desc="16 miếng gà + Khoai tây + Pepsi" price="559,000đ" />
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center text-3xl font-bold text-gray-900">
            {t("gallery")}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {["Tiệc sinh nhật", "Sự kiện công ty", "Họp mặt gia đình"].map((label, i) => (
              <div key={i} className="flex h-48 items-center justify-center rounded-xl bg-red-100 text-red-600 font-medium">
                <PartyPopper className="mr-2 h-6 w-6" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking Form */}
      <section id="booking-form" className="px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <Card className="border-2 border-red-100">
            <CardContent className="p-8">
              <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">
                {t("formTitle")}
              </h2>

              {result === "success" && (
                <div className="mb-6 rounded-lg bg-green-50 p-4 text-center text-green-800 font-medium">
                  {t("formSuccess")}
                </div>
              )}
              {result === "error" && (
                <div className="mb-6 rounded-lg bg-red-50 p-4 text-center text-red-800 font-medium">
                  {t("formError")}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>{t("formName")} *</Label>
                    <Input
                      required
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                  <div>
                    <Label>{t("formPhone")} *</Label>
                    <Input
                      required
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="0901 234 567"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>{t("formEventType")}</Label>
                    <Select value={form.event_type} onValueChange={(v) => { if (v) setForm(f => ({ ...f, event_type: v })); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPES.map(et => (
                          <SelectItem key={et} value={et}>{t(`eventTypes.${et}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("formGuestCount")}</Label>
                    <Input
                      type="number"
                      min={20}
                      max={500}
                      value={form.guest_count}
                      onChange={e => setForm(f => ({ ...f, guest_count: e.target.value }))}
                      placeholder="50"
                    />
                  </div>
                </div>

                <div>
                  <Label>{t("formDate")}</Label>
                  <Input
                    type="date"
                    value={form.preferred_date}
                    onChange={e => setForm(f => ({ ...f, preferred_date: e.target.value }))}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div>
                  <Label>{t("formNotes")}</Label>
                  <Textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-red-600 py-6 text-lg font-bold hover:bg-red-700"
                >
                  {submitting ? "..." : t("formSubmit")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 px-4 py-8 text-center text-gray-400">
        <div className="flex items-center justify-center gap-2 text-white">
          <Phone className="h-4 w-4" />
          <span className="font-semibold">1900-1234</span>
        </div>
        <p className="mt-2 text-sm">KFC Vietnam — 260+ stores nationwide</p>
        <p className="mt-1 text-xs">© {new Date().getFullYear()} KFC Vietnam Big Orders</p>
      </footer>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
}

function FeatureCard({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-white p-6 shadow-sm text-center">
      {icon}
      <div className="mt-3 text-2xl font-bold text-gray-900">{title}</div>
      <div className="text-gray-500">{subtitle}</div>
    </div>
  );
}

function MenuCard({ name, desc, price }: { name: string; desc: string; price: string }) {
  return (
    <Card className="overflow-hidden transition hover:shadow-md">
      <div className="flex h-32 items-center justify-center bg-red-50">
        <UtensilsCrossed className="h-12 w-12 text-red-300" />
      </div>
      <CardContent className="p-4">
        <h3 className="font-bold text-gray-900">{name}</h3>
        <p className="mt-1 text-sm text-gray-500">{desc}</p>
        <p className="mt-2 text-lg font-bold text-red-600">{price}</p>
      </CardContent>
    </Card>
  );
}
