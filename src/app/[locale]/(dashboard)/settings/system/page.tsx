"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Monitor, ChevronLeft, ChevronRight } from "lucide-react";

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user_name?: string;
}

const PAGE_SIZE = 25;

export default function SystemPage() {
  const t = useTranslations("settings");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filterEntity, setFilterEntity] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      offset: String(page * PAGE_SIZE),
      limit: String(PAGE_SIZE + 1),
    });
    if (filterEntity) params.set("entity_type", filterEntity);
    if (filterAction) params.set("action", filterAction);

    const res = await fetch(`/api/settings/audit-logs?${params}`);
    if (res.ok) {
      const json = await res.json();
      const items = json.data || [];
      setHasMore(items.length > PAGE_SIZE);
      setLogs(items.slice(0, PAGE_SIZE));
    }
    setLoading(false);
  }, [page, filterEntity, filterAction]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleFilter = () => {
    setPage(0);
    loadLogs();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            {t("auditLog")}
          </CardTitle>
          <CardDescription>{t("auditLogDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="space-y-1">
              <Label className="text-xs">{t("entityType")}</Label>
              <Input
                className="w-40"
                placeholder="e.g. lead, order"
                value={filterEntity}
                onChange={(e) => setFilterEntity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFilter()}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("actionFilter")}</Label>
              <Input
                className="w-40"
                placeholder="e.g. create, update"
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFilter()}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{t("noAuditLogs")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">{t("timestamp")}</th>
                    <th className="pb-2 pr-4">{t("user")}</th>
                    <th className="pb-2 pr-4">{t("actionCol")}</th>
                    <th className="pb-2 pr-4">{t("entityType")}</th>
                    <th className="pb-2">{t("entityId")}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <Fragment key={log.id}>
                      <tr
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      >
                        <td className="py-2 pr-4 whitespace-nowrap text-xs">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-2 pr-4 text-xs">{log.user_name || log.user_id?.slice(0, 8)}</td>
                        <td className="py-2 pr-4">
                          <Badge variant="secondary" className="text-xs">{log.action}</Badge>
                        </td>
                        <td className="py-2 pr-4 text-xs">{log.entity_type}</td>
                        <td className="py-2 text-xs font-mono">{log.entity_id?.slice(0, 8) || "—"}</td>
                      </tr>
                      {expandedId === log.id && (
                        <tr key={`${log.id}-detail`}>
                          <td colSpan={5} className="bg-gray-50 p-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              {log.old_data && (
                                <div>
                                  <p className="font-medium mb-1 text-gray-600">{t("oldData")}</p>
                                  <pre className="bg-white p-2 rounded border overflow-x-auto max-h-40">
                                    {JSON.stringify(log.old_data, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.new_data && (
                                <div>
                                  <p className="font-medium mb-1 text-gray-600">{t("newData")}</p>
                                  <pre className="bg-white p-2 rounded border overflow-x-auto max-h-40">
                                    {JSON.stringify(log.new_data, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.ip_address && (
                                <div>
                                  <span className="text-gray-500">IP: </span>
                                  <span className="font-mono">{log.ip_address}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t("previous")}
            </Button>
            <span className="text-xs text-gray-500">
              {t("pageNum", { page: page + 1 })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
            >
              {t("next")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
