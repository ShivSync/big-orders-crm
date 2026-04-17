"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Key } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export default function SettingsPage() {
  const t = useTranslations("settings");
  const [settings, setSettings] = useState<Setting[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const json = await res.json();
      setSettings(json.data || []);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSave = async (key: string) => {
    const value = editValues[key];
    if (value === undefined) return;

    setSaving(prev => ({ ...prev, [key]: true }));
    setMessage(null);

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });

    if (res.ok) {
      setMessage({ type: "success", text: t("saveSuccess") });
      setEditValues(prev => { const next = { ...prev }; delete next[key]; return next; });
      loadSettings();
    } else {
      setMessage({ type: "error", text: t("saveError") });
    }

    setSaving(prev => ({ ...prev, [key]: false }));
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {message && (
        <div className={`p-3 rounded text-sm ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {message.text}
        </div>
      )}

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
                    <Button
                      onClick={() => handleSave(setting.key)}
                      disabled={saving[setting.key]}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {saving[setting.key] ? "..." : t("saveSuccess").split(" ")[0]}
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
