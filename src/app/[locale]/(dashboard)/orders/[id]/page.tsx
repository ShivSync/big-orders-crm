"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { Order, OrderItem, OrderStatusHistory, OrderStatus, Store, User } from "@/types/database";

const STATUSES: OrderStatus[] = ["draft", "confirmed", "preparing", "ready", "fulfilled", "cancelled"];

const statusColors: Record<OrderStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-yellow-100 text-yellow-800",
  ready: "bg-green-100 text-green-800",
  fulfilled: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusPipelineColors: Record<OrderStatus, string> = {
  draft: "bg-gray-300",
  confirmed: "bg-blue-500",
  preparing: "bg-yellow-500",
  ready: "bg-green-500",
  fulfilled: "bg-purple-500",
  cancelled: "bg-red-500",
};

const STATUS_I18N: Record<OrderStatus, string> = {
  draft: "statusDraft",
  confirmed: "statusConfirmed",
  preparing: "statusPreparing",
  ready: "statusReady",
  fulfilled: "statusFulfilled",
  cancelled: "statusCancelled",
};

const PAYMENT_I18N: Record<string, string> = {
  unpaid: "paymentUnpaid",
  partial: "paymentPartial",
  paid: "paymentPaid",
};

const EVENT_I18N: Record<string, string> = {
  birthday: "eventBirthday",
  corporate: "eventCorporate",
  school_event: "eventSchool",
  meeting: "eventMeeting",
  custom: "eventCustom",
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["fulfilled", "cancelled"],
  fulfilled: [],
  cancelled: [],
};

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

export default function OrderDetailPage() {
  const t = useTranslations("orders");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const supabase = createClient();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [history, setHistory] = useState<(OrderStatusHistory & { changer?: Pick<User, "id" | "name"> | null })[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  // Status change dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [cancelNotes, setCancelNotes] = useState("");
  const [alohaBillId, setAlohaBillId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);

    const [orderRes, itemsRes, historyRes] = await Promise.all([
      supabase.from("orders").select("*").eq("id", orderId).single(),
      supabase.from("order_items").select("*").eq("order_id", orderId).order("created_at"),
      supabase.from("order_status_history")
        .select("*, changer:users!order_status_history_changed_by_fkey(id, name)")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false }),
    ]);

    if (orderRes.data) {
      setOrder(orderRes.data);
      if (orderRes.data.store_id) {
        const storeRes = await supabase.from("stores").select("*").eq("id", orderRes.data.store_id).single();
        setStore(storeRes.data);
      }
    }
    setItems(itemsRes.data ?? []);
    setHistory(historyRes.data ?? []);
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleStatusChange() {
    if (!newStatus || !order) return;
    if (newStatus === "cancelled" && !cancelNotes.trim()) {
      toast.error(t("cancelReasonRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          notes: cancelNotes.trim() || null,
          aloha_bill_id: alohaBillId.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update status");
        return;
      }

      toast.success(t("statusChanged"));
      setStatusDialogOpen(false);
      setCancelNotes("");
      setAlohaBillId("");
      loadData();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePaymentToggle(newPaymentStatus: string) {
    if (!order) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: newPaymentStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update payment status");
        return;
      }
      toast.success(t("orderUpdated"));
      loadData();
    } catch {
      toast.error("Failed to update payment status");
    }
  }

  async function handleAlohaSave() {
    if (!order) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aloha_bill_id: alohaBillId.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update Aloha Bill ID");
        return;
      }
      toast.success(t("orderUpdated"));
      loadData();
    } catch {
      toast.error("Failed to update Aloha Bill ID");
    }
  }

  if (loading) return <p className="text-muted-foreground">{tCommon("loading")}</p>;
  if (!order) return <p className="text-muted-foreground">Order not found</p>;

  const allowedTransitions = VALID_TRANSITIONS[order.status] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.push("/orders")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {tCommon("back")}
        </Button>
        <h1 className="text-2xl font-bold">{t("orderDetail")}</h1>
        <span className="font-mono text-lg text-muted-foreground">{order.order_number}</span>
      </div>

      {/* Status Pipeline */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-1">
            {STATUSES.filter(s => s !== "cancelled").map((s, i) => {
              const idx = STATUSES.indexOf(order.status);
              const isActive = STATUSES.indexOf(s) <= idx && order.status !== "cancelled";
              const isCurrent = s === order.status;
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className={`flex-1 h-2 rounded-full ${isActive ? statusPipelineColors[s] : "bg-muted"} ${isCurrent ? "ring-2 ring-offset-1 ring-primary" : ""}`} />
                  {i < 4 && <div className="w-1" />}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            {STATUSES.filter(s => s !== "cancelled").map(s => (
              <span key={s} className={s === order.status ? "font-bold text-foreground" : ""}>
                {t(STATUS_I18N[s])}
              </span>
            ))}
          </div>
          {order.status === "cancelled" && (
            <Badge className="mt-2 bg-red-100 text-red-800">{t("statusCancelled")}</Badge>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("orderDetail")}</CardTitle>
                <div className="flex gap-2">
                  <Badge className={statusColors[order.status]}>
                    {t(STATUS_I18N[order.status])}
                  </Badge>
                  {allowedTransitions.length > 0 && (
                    <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                      <DialogTrigger>
                        <Button variant="outline" size="sm">{t("changeStatus")}</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t("changeStatus")}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-2">
                            {allowedTransitions.map(s => (
                              <Button
                                key={s}
                                variant={newStatus === s ? "default" : "outline"}
                                size="sm"
                                onClick={() => setNewStatus(s)}
                              >
                                {t(STATUS_I18N[s as OrderStatus])}
                              </Button>
                            ))}
                          </div>
                          {newStatus === "cancelled" && (
                            <div>
                              <Label>{t("cancelReason")} *</Label>
                              <Textarea
                                value={cancelNotes}
                                onChange={e => setCancelNotes(e.target.value)}
                                rows={3}
                              />
                            </div>
                          )}
                          {newStatus === "preparing" && (
                            <div>
                              <Label>{t("alohaBillId")}</Label>
                              <Input
                                value={alohaBillId}
                                onChange={e => setAlohaBillId(e.target.value)}
                              />
                            </div>
                          )}
                          <Button
                            onClick={handleStatusChange}
                            disabled={!newStatus || submitting}
                          >
                            {tCommon("confirm")}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">{t("contactName")}:</span> {order.contact_name}</div>
                <div><span className="text-muted-foreground">{t("contactPhone")}:</span> {order.contact_phone}</div>
                <div><span className="text-muted-foreground">{t("store")}:</span> {store?.name ?? "-"}</div>
                <div><span className="text-muted-foreground">{t("eventType")}:</span> {t(EVENT_I18N[order.event_type] ?? "eventCustom")}</div>
                <div><span className="text-muted-foreground">{t("scheduledDate")}:</span> {order.scheduled_date}</div>
                <div><span className="text-muted-foreground">{t("guestCount")}:</span> {order.guest_count ?? "-"}</div>
                <div><span className="text-muted-foreground">{t("source")}:</span> {order.source}</div>
                <div><span className="text-muted-foreground">{t("createdAt")}:</span> {new Date(order.created_at).toLocaleDateString()}</div>
              </div>
              {order.delivery_notes && (
                <div className="mt-3 text-sm">
                  <span className="text-muted-foreground">{t("deliveryNotes")}:</span> {order.delivery_notes}
                </div>
              )}
              {order.notes && (
                <div className="mt-1 text-sm">
                  <span className="text-muted-foreground">{t("notes")}:</span> {order.notes}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items table */}
          <Card>
            <CardHeader><CardTitle>{t("items")}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">{t("quantity")}</TableHead>
                    <TableHead className="text-right">{t("unitPrice")}</TableHead>
                    <TableHead className="text-right">{t("lineTotal")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">{locale === "vi" ? item.name_vi : item.name_en}</p>
                        <p className="text-xs text-muted-foreground">{item.item_code}</p>
                        {item.special_requests && (
                          <p className="text-xs text-yellow-600">{item.special_requests}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatVND(item.unit_price)}</TableCell>
                      <TableCell className="text-right font-medium">{formatVND(item.line_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="border-t mt-4 pt-4 space-y-1 text-right">
                <div className="text-sm">{t("subtotal")}: {formatVND(order.subtotal)}</div>
                {order.discount_pct > 0 && (
                  <div className="text-sm text-red-600">
                    {t("discount")} ({order.discount_pct}%): -{formatVND(order.discount_amount)}
                  </div>
                )}
                <div className="text-lg font-bold">{t("totalValue")}: {formatVND(order.total_value)}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment */}
          <Card>
            <CardHeader><CardTitle>{t("paymentStatus")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Badge className={`text-sm ${
                order.payment_status === "paid" ? "bg-green-100 text-green-800" :
                order.payment_status === "partial" ? "bg-yellow-100 text-yellow-800" :
                "bg-red-100 text-red-800"
              }`}>
                {t(PAYMENT_I18N[order.payment_status])}
              </Badge>
              <div className="flex gap-2">
                {["unpaid", "partial", "paid"].map(ps => (
                  <Button
                    key={ps}
                    variant={order.payment_status === ps ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePaymentToggle(ps)}
                    disabled={order.payment_status === ps}
                  >
                    {t(PAYMENT_I18N[ps])}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Aloha Bill ID */}
          <Card>
            <CardHeader><CardTitle>{t("alohaBillId")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Input
                value={alohaBillId || order.aloha_bill_id || ""}
                onChange={e => setAlohaBillId(e.target.value)}
                placeholder="Aloha Bill ID"
              />
              <Button variant="outline" size="sm" onClick={handleAlohaSave}>
                {tCommon("save")}
              </Button>
            </CardContent>
          </Card>

          {/* Status History */}
          <Card>
            <CardHeader><CardTitle>{t("statusHistory")}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.map(h => (
                  <div key={h.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-1">
                      {h.to_status === "cancelled" ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : h.to_status === "fulfilled" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p>
                        {h.from_status ? (
                          <>{t(STATUS_I18N[h.from_status as OrderStatus] ?? h.from_status)} → </>
                        ) : null}
                        <span className="font-medium">{t(STATUS_I18N[h.to_status as OrderStatus] ?? h.to_status)}</span>
                      </p>
                      {h.notes && <p className="text-muted-foreground">{h.notes}</p>}
                      <p className="text-xs text-muted-foreground">
                        {h.changer?.name ?? "System"} · {new Date(h.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
