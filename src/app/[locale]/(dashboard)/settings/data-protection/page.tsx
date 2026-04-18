"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, FileText, Download, Trash2, ChevronLeft, ChevronRight, Search, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface CustomerConsent {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  consent_given: boolean;
  consent_date: string | null;
  created_at: string;
}

interface DeletionRequest {
  id: string;
  customer_name: string;
  customer_id: string;
  requested_at: string;
  reason: string;
  status: "pending" | "completed";
}

const PAGE_SIZE = 25;

export default function DataProtectionPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");

  const [customers, setCustomers] = useState<CustomerConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [consentFilter, setConsentFilter] = useState<"all" | "yes" | "no">("all");
  const [exporting, setExporting] = useState(false);

  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [loadingDeletions, setLoadingDeletions] = useState(true);
  const [deleteCustomerId, setDeleteCustomerId] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [submittingDeletion, setSubmittingDeletion] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      offset: String(page * PAGE_SIZE),
      limit: String(PAGE_SIZE + 1),
    });
    if (search) params.set("search", search);
    if (consentFilter !== "all") params.set("consent", consentFilter);

    const res = await fetch(`/api/settings/data-protection/consent?${params}`);
    if (res.ok) {
      const json = await res.json();
      const items = json.data || [];
      setHasMore(items.length > PAGE_SIZE);
      setCustomers(items.slice(0, PAGE_SIZE));
    }
    setLoading(false);
  }, [page, search, consentFilter]);

  const loadDeletionRequests = useCallback(async () => {
    setLoadingDeletions(true);
    const res = await fetch("/api/settings/data-protection/deletions");
    if (res.ok) {
      const json = await res.json();
      setDeletionRequests(json.data || []);
    }
    setLoadingDeletions(false);
  }, []);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);
  useEffect(() => { loadDeletionRequests(); }, [loadDeletionRequests]);

  const handleExportCsv = async () => {
    setExporting(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (consentFilter !== "all") params.set("consent", consentFilter);
    params.set("format", "csv");

    const res = await fetch(`/api/settings/data-protection/consent?${params}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `consent-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("exportSuccess"));
    } else {
      toast.error(t("exportError"));
    }
    setExporting(false);
  };

  const handleSubmitDeletion = async () => {
    if (!deleteCustomerId.trim() || !deleteReason.trim()) return;

    setSubmittingDeletion(true);
    const res = await fetch("/api/settings/data-protection/deletions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id: deleteCustomerId.trim(), reason: deleteReason.trim() }),
    });

    if (res.ok) {
      toast.success(t("deletionSubmitted"));
      setDeleteCustomerId("");
      setDeleteReason("");
      loadDeletionRequests();
      loadCustomers();
    } else {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error || t("deletionError"));
    }
    setSubmittingDeletion(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t("consentReport")}
              </CardTitle>
              <CardDescription>{t("consentReportDescription")}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
              {t("exportCsv")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-8"
                placeholder={t("searchCustomers")}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              />
            </div>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={consentFilter}
              onChange={(e) => { setConsentFilter(e.target.value as "all" | "yes" | "no"); setPage(0); }}
            >
              <option value="all">{tc("all")}</option>
              <option value="yes">{t("consentGiven")}</option>
              <option value="no">{t("consentNotGiven")}</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{tc("noData")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">{t("customerName")}</th>
                    <th className="pb-2 pr-4">{t("phone")}</th>
                    <th className="pb-2 pr-4">{t("consentStatus")}</th>
                    <th className="pb-2">{t("consentDate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="py-2 pr-4">{c.name}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{c.phone}</td>
                      <td className="py-2 pr-4">
                        <Badge className={c.consent_given ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {c.consent_given ? t("consentGiven") : t("consentNotGiven")}
                        </Badge>
                      </td>
                      <td className="py-2 text-xs">
                        {c.consent_date ? new Date(c.consent_date).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t("previous")}
            </Button>
            <span className="text-xs text-gray-500">{t("pageNum", { page: page + 1 })}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!hasMore}>
              {t("next")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            {t("deletionRequests")}
          </CardTitle>
          <CardDescription>{t("deletionRequestsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{t("deletionWarning")}</span>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-xs">{t("customerId")}</Label>
              <Input
                placeholder={t("enterCustomerId")}
                value={deleteCustomerId}
                onChange={(e) => setDeleteCustomerId(e.target.value)}
              />
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-xs">{t("deletionReason")}</Label>
              <Input
                placeholder={t("enterReason")}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
              />
            </div>
            <div className="self-end">
              <Button
                variant="destructive"
                onClick={handleSubmitDeletion}
                disabled={submittingDeletion || !deleteCustomerId.trim() || !deleteReason.trim()}
              >
                {submittingDeletion ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                {t("submitDeletion")}
              </Button>
            </div>
          </div>

          {loadingDeletions ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : deletionRequests.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">{t("noDeletionRequests")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">{t("customerName")}</th>
                    <th className="pb-2 pr-4">{t("deletionReason")}</th>
                    <th className="pb-2 pr-4">{t("requestedAt")}</th>
                    <th className="pb-2">{tc("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {deletionRequests.map((dr) => (
                    <tr key={dr.id} className="border-b">
                      <td className="py-2 pr-4">{dr.customer_name}</td>
                      <td className="py-2 pr-4 text-xs">{dr.reason}</td>
                      <td className="py-2 pr-4 text-xs">{new Date(dr.requested_at).toLocaleString()}</td>
                      <td className="py-2">
                        <Badge className={dr.status === "completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                          {dr.status === "completed" ? t("completed") : t("pending")}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
