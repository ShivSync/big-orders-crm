"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Database, Plug, Copy, Check, Loader2 } from "lucide-react";

interface SyncStatus {
  lastStoreSyncAt: string | null;
  omsStoreCount: number;
  totalStores: number;
  omsCustomerCount: number;
  connectionStatus: {
    connected: boolean;
    latencyMs: number;
    error?: string;
  };
}

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors?: string[];
}

export default function IntegrationsPage() {
  const t = useTranslations("integrations");
  const tCommon = useTranslations("common");

  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [importResult, setImportResult] = useState<SyncResult | null>(null);
  const [copied, setCopied] = useState(false);

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/oms`
    : "/api/webhooks/oms";

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/oms/sync-status");
    if (res.ok) {
      setStatus(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    const res = await fetch("/api/oms/sync-stores", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setSyncResult(data);
      loadStatus();
    }
    setSyncing(false);
  }

  async function handleImport() {
    setImporting(true);
    setImportResult(null);
    const res = await fetch("/api/oms/seed-customers", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setImportResult(data);
      loadStatus();
    }
    setImporting(false);
  }

  function copyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <p className="text-sm text-gray-400 text-center py-12">{tCommon("loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plug className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-lg">{t("connectionStatus")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={status?.connectionStatus.connected ? "default" : "destructive"}>
                {status?.connectionStatus.connected ? t("connected") : t("disconnected")}
              </Badge>
              {status?.connectionStatus.error && (
                <Badge variant="outline" className="text-xs">{t("mockMode")}</Badge>
              )}
              {status?.connectionStatus.connected && status.connectionStatus.latencyMs > 0 && (
                <span className="text-xs text-gray-400">{status.connectionStatus.latencyMs}ms</span>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">{t("webhookUrl")}</label>
              <p className="text-xs text-gray-400 mb-1">{t("webhookDescription")}</p>
              <div className="flex gap-2">
                <Input value={webhookUrl} readOnly className="text-xs font-mono" />
                <Button variant="outline" size="sm" onClick={copyWebhookUrl} className="shrink-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span className="ml-1 text-xs">{copied ? t("copied") : t("copyUrl")}</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Store Sync */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg">{t("omsSync")}</CardTitle>
              </div>
              <Button onClick={handleSync} disabled={syncing} size="sm">
                {syncing ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1" />{t("syncing")}</>
                ) : (
                  t("syncNow")
                )}
              </Button>
            </div>
            <CardDescription>{t("omsSyncDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t("lastSynced")}</span>
              <span className="font-medium">
                {status?.lastStoreSyncAt
                  ? new Date(status.lastStoreSyncAt).toLocaleString()
                  : t("never")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t("storeCount", { count: status?.omsStoreCount ?? 0, total: status?.totalStores ?? 0 })}</span>
            </div>
            {syncResult && (
              <div className="p-2 rounded bg-green-50 text-green-700 text-sm">
                {t("syncSuccess", { created: syncResult.created, updated: syncResult.updated })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Import */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-lg">{t("customerSeed")}</CardTitle>
              </div>
              <Button onClick={handleImport} disabled={importing} size="sm" variant="outline">
                {importing ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1" />{t("importing")}</>
                ) : (
                  t("importHistory")
                )}
              </Button>
            </div>
            <CardDescription>{t("customerSeedDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-600">
              {(status?.omsCustomerCount ?? 0) > 0
                ? t("alreadyImported", { count: status?.omsCustomerCount ?? 0 })
                : t("noOmsCustomers")}
            </div>
            {importResult && (
              <div className="p-2 rounded bg-green-50 text-green-700 text-sm">
                {t("importComplete", {
                  created: importResult.created,
                  updated: importResult.updated,
                  skipped: importResult.skipped,
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
