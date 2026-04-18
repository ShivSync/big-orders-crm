"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Key, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Setting {
  key: string;
  value: string;
  description: string;
  updated_at: string;
  configured: boolean;
}

const KEY_LABELS: Record<string, string> = {
  google_places_api_key: "googlePlacesKey",
  apify_api_key: "apifyKey",
  firecrawl_api_key: "firecrawlKey",
};

export default function ApiKeysPage() {
  const t = useTranslations("settings");
  const [settings, setSettings] = useState<Setting[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const json = await res.json();
      setSettings(json.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSave = async (key: string) => {
    const value = editValues[key];
    if (value === undefined) return;

    setSaving(prev => ({ ...prev, [key]: true }));

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });

    if (res.ok) {
      toast.success(t("saveSuccess"));
      setEditValues(prev => { const next = { ...prev }; delete next[key]; return next; });
      loadSettings();
    } else {
      toast.error(t("saveError"));
    }

    setSaving(prev => ({ ...prev, [key]: false }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t("apiKeys")}
          </CardTitle>
          <CardDescription>{t("apiKeysDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settings.map(setting => {
            const labelKey = KEY_LABELS[setting.key];
            const isEditing = editValues[setting.key] !== undefined;

            return (
              <div key={setting.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{labelKey ? t(labelKey) : setting.key}</Label>
                  {setting.configured && !isEditing && (
                    <Badge className="bg-green-100 text-green-800 text-xs">✓ Configured</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="password"
                      value={isEditing ? editValues[setting.key] : ""}
                      onChange={e => setEditValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                      placeholder={setting.configured ? t("masked") : setting.description}
                    />
                  </div>
                  {isEditing && (
                    <Button onClick={() => handleSave(setting.key)} disabled={saving[setting.key]}>
                      {saving[setting.key] ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                      {t("saveSuccess").split(" ")[0]}
                    </Button>
                  )}
                </div>
                {setting.updated_at && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(setting.updated_at).toLocaleString()}
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
