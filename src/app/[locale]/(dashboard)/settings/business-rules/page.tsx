"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Shield, Lock } from "lucide-react";
import { toast } from "sonner";

interface BusinessRule {
  id: string;
  rule_type: string;
  rule_key: string;
  rule_value: Record<string, unknown>;
  applies_to_role: string | null;
  approval_role: string | null;
  name_en: string;
  name_vi: string;
  active: boolean;
}

export default function BusinessRulesPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [editValues, setEditValues] = useState<Record<string, Record<string, unknown>>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/settings/business-rules");
      if (res.ok) {
        const json = await res.json();
        setRules(json.data || []);
        setIsAdmin(json.isAdmin ?? false);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async (rule: BusinessRule) => {
    const updates = editValues[rule.id];
    if (!updates) return;

    setSaving(prev => ({ ...prev, [rule.id]: true }));

    const res = await fetch("/api/settings/business-rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id, rule_value: { ...rule.rule_value, ...updates } }),
    });

    if (res.ok) {
      toast.success(t("saveSuccess"));
      setEditValues(prev => { const next = { ...prev }; delete next[rule.id]; return next; });
      const refreshRes = await fetch("/api/settings/business-rules");
      if (refreshRes.ok) {
        const json = await refreshRes.json();
        setRules(json.data || []);
      }
    } else {
      toast.error(t("saveError"));
    }
    setSaving(prev => ({ ...prev, [rule.id]: false }));
  };

  const getRuleDisplayValue = (rule: BusinessRule): string => {
    const val = rule.rule_value;
    if (rule.rule_type === "approval_threshold" && val.threshold_vnd != null) {
      return Number(val.threshold_vnd).toLocaleString() + " ₫";
    }
    if (rule.rule_type === "discount_limit" && val.max_pct != null) {
      return val.max_pct + "%";
    }
    return JSON.stringify(val);
  };

  const getEditField = (rule: BusinessRule) => {
    const val = rule.rule_value;
    const edited = editValues[rule.id] || {};

    if (rule.rule_type === "approval_threshold") {
      return (
        <div className="space-y-1">
          <Label className="text-xs">{t("thresholdVnd")}</Label>
          <Input
            type="number"
            value={edited.threshold_vnd !== undefined ? String(edited.threshold_vnd) : String(val.threshold_vnd || "")}
            onChange={(e) => setEditValues(prev => ({
              ...prev,
              [rule.id]: { ...prev[rule.id], threshold_vnd: Number(e.target.value) },
            }))}
            disabled={!isAdmin}
          />
        </div>
      );
    }

    if (rule.rule_type === "discount_limit") {
      return (
        <div className="space-y-1">
          <Label className="text-xs">{t("maxDiscountPct")}</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={edited.max_pct !== undefined ? String(edited.max_pct) : String(val.max_pct || "")}
            onChange={(e) => setEditValues(prev => ({
              ...prev,
              [rule.id]: { ...prev[rule.id], max_pct: Number(e.target.value) },
            }))}
            disabled={!isAdmin}
          />
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <Label className="text-xs">JSON</Label>
        <Input
          value={edited._raw !== undefined ? String(edited._raw) : JSON.stringify(val)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              setEditValues(prev => ({ ...prev, [rule.id]: parsed }));
            } catch {
              setEditValues(prev => ({ ...prev, [rule.id]: { _raw: e.target.value } }));
            }
          }}
          disabled={!isAdmin}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {!isAdmin && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <Lock className="h-4 w-4" />
          {t("businessRulesReadOnly")}
        </div>
      )}

      {rules.map((rule) => (
        <Card key={rule.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {rule.name_en}
              </CardTitle>
              <Badge variant={rule.active ? "default" : "secondary"}>
                {rule.active ? tc("active") : tc("inactive")}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {rule.rule_key} · {t("currentValue")}: {getRuleDisplayValue(rule)}
              {rule.applies_to_role && ` · ${t("appliesTo")}: ${rule.applies_to_role}`}
              {rule.approval_role && ` · ${t("approvedBy")}: ${rule.approval_role}`}
            </CardDescription>
          </CardHeader>
          {isAdmin && (
            <CardContent className="space-y-3">
              {getEditField(rule)}
              {editValues[rule.id] && (
                <Button
                  size="sm"
                  onClick={() => handleSave(rule)}
                  disabled={saving[rule.id]}
                >
                  {saving[rule.id] ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  {tc("save")}
                </Button>
              )}
            </CardContent>
          )}
        </Card>
      ))}

      {rules.length === 0 && (
        <div className="text-center py-12 text-gray-500">{tc("noData")}</div>
      )}
    </div>
  );
}
