"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
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
import { Plus, Search, Eye, ShoppingCart, Clock, CheckCircle, DollarSign } from "lucide-react";
import type { Order, OrderStatus, Store } from "@/types/database";

function sanitizeSearch(input: string): string {
  return input.replace(/[%_\\(),.*]/g, "").trim();
}

const STATUSES: OrderStatus[] = ["draft", "confirmed", "preparing", "ready", "fulfilled", "cancelled"];

const statusColors: Record<OrderStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-yellow-100 text-yellow-800",
  ready: "bg-green-100 text-green-800",
  fulfilled: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_I18N: Record<OrderStatus, string> = {
  draft: "statusDraft",
  confirmed: "statusConfirmed",
  preparing: "statusPreparing",
  ready: "statusReady",
  fulfilled: "statusFulfilled",
  cancelled: "statusCancelled",
};

const EVENT_I18N: Record<string, string> = {
  birthday: "eventBirthday",
  corporate: "eventCorporate",
  school_event: "eventSchool",
  meeting: "eventMeeting",
  custom: "eventCustom",
};

const PAYMENT_I18N: Record<string, string> = {
  unpaid: "paymentUnpaid",
  partial: "paymentPartial",
  paid: "paymentPaid",
};

const paymentColors: Record<string, string> = {
  unpaid: "bg-red-100 text-red-800",
  partial: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
};

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

export default function OrdersPage() {
  const t = useTranslations("orders");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [orders, setOrders] = useState<(Order & { store?: Pick<Store, "id" | "name"> | null })[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterStore, setFilterStore] = useState<string>("all");

  // Stats
  const [stats, setStats] = useState({ total: 0, pending: 0, fulfilledMonth: 0, revenueMonth: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("orders")
      .select("*, store:stores!orders_store_id_fkey(id, name)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (filterStatus !== "all") query = query.eq("status", filterStatus);
    if (filterStore !== "all") query = query.eq("store_id", filterStore);
    const cleaned = sanitizeSearch(searchQuery);
    if (cleaned) {
      query = query.or(`order_number.ilike.%${cleaned}%,contact_name.ilike.%${cleaned}%`);
    }

    const [ordersRes, storesRes] = await Promise.all([
      query,
      supabase.from("stores").select("*").eq("active", true),
    ]);

    const ordersData = ordersRes.data ?? [];
    setOrders(ordersData);
    setStores(storesRes.data ?? []);

    // Compute stats from all (unfiltered) orders for this view
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const pending = ordersData.filter(o => ["draft", "confirmed", "preparing", "ready"].includes(o.status)).length;
    const fulfilledMonth = ordersData.filter(o => o.status === "fulfilled" && o.updated_at >= monthStart).length;
    const revenueMonth = ordersData
      .filter(o => o.status === "fulfilled" && o.updated_at >= monthStart)
      .reduce((sum, o) => sum + o.total_value, 0);

    setStats({
      total: ordersData.length,
      pending,
      fulfilledMonth,
      revenueMonth,
    });

    setLoading(false);
  }, [filterStatus, filterStore, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button onClick={() => router.push("/orders/new")}>
          <Plus className="h-4 w-4 mr-2" />
          {t("createOrder")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">{t("totalOrders")}</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">{t("pendingOrders")}</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">{t("fulfilledThisMonth")}</p>
              <p className="text-2xl font-bold">{stats.fulfilledMonth}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">{t("revenueThisMonth")}</p>
              <p className="text-2xl font-bold">{formatVND(stats.revenueMonth)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tCommon("search")}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "all")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={tCommon("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("all")}</SelectItem>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>{t(STATUS_I18N[s])}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStore} onValueChange={(v) => setFilterStore(v ?? "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("store")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("all")}</SelectItem>
            {stores.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      {loading ? (
        <p className="text-muted-foreground">{tCommon("loading")}</p>
      ) : orders.length === 0 ? (
        <p className="text-muted-foreground">{t("noOrders")}</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("orderNumber")}</TableHead>
                <TableHead>{t("contactName")}</TableHead>
                <TableHead>{t("store")}</TableHead>
                <TableHead>{t("eventType")}</TableHead>
                <TableHead>{t("scheduledDate")}</TableHead>
                <TableHead className="text-right">{t("totalValue")}</TableHead>
                <TableHead>{tCommon("status")}</TableHead>
                <TableHead>{t("paymentStatus")}</TableHead>
                <TableHead>{tCommon("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                  <TableCell>{order.contact_name}</TableCell>
                  <TableCell>{order.store?.name ?? "-"}</TableCell>
                  <TableCell>{t(EVENT_I18N[order.event_type] ?? "eventCustom")}</TableCell>
                  <TableCell>{order.scheduled_date}</TableCell>
                  <TableCell className="text-right font-medium">{formatVND(order.total_value)}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[order.status]}>
                      {t(STATUS_I18N[order.status])}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={paymentColors[order.payment_status] ?? ""}>
                      {t(PAYMENT_I18N[order.payment_status] ?? "paymentUnpaid")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/orders/${order.id}`)}>
                      <Eye className="h-4 w-4 mr-1" />
                      {t("viewDetails")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
