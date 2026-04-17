"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Layout, ImageIcon, FileText } from "lucide-react";

interface Section {
  id: string;
  section: string;
  content: Record<string, unknown>;
  sort_order: number;
  active: boolean;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  hero: <Layout className="h-5 w-5" />,
  menu: <FileText className="h-5 w-5" />,
  gallery: <ImageIcon className="h-5 w-5" />,
  form_config: <FileText className="h-5 w-5" />,
  footer: <FileText className="h-5 w-5" />,
};

export default function LandingPageEditor() {
  const t = useTranslations("settings");
  const [sections, setSections] = useState<Section[]>([]);
  const [editJson, setEditJson] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/settings/landing-content");
    if (res.ok) {
      const data = await res.json();
      setSections(data.data || []);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (id: string, section: string) => {
    const json = editJson[id];
    if (!json) return;

    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch {
      setMessage({ type: "error", text: "Invalid JSON" });
      return;
    }

    setSaving(prev => ({ ...prev, [id]: true }));
    const res = await fetch("/api/settings/landing-content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, section, content: parsed }),
    });

    if (res.ok) {
      setMessage({ type: "success", text: t("saveSuccess") });
      setEditJson(prev => { const n = { ...prev }; delete n[id]; return n; });
      load();
    } else {
      setMessage({ type: "error", text: t("saveError") });
    }

    setSaving(prev => ({ ...prev, [id]: false }));
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Landing Page CMS</h1>

      {message && (
        <div className={`p-3 rounded text-sm ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {message.text}
        </div>
      )}

      {sections.map(sec => (
        <Card key={sec.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {SECTION_ICONS[sec.section] || <FileText className="h-5 w-5" />}
              {sec.section.toUpperCase()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sec.section === "hero" ? (
              <HeroEditor
                content={sec.content}
                onChange={json => setEditJson(prev => ({ ...prev, [sec.id]: json }))}
              />
            ) : (
              <>
                <Label>Content (JSON)</Label>
                <Textarea
                  rows={8}
                  value={editJson[sec.id] ?? JSON.stringify(sec.content, null, 2)}
                  onChange={e => setEditJson(prev => ({ ...prev, [sec.id]: e.target.value }))}
                  className="font-mono text-xs"
                />
              </>
            )}
            {editJson[sec.id] !== undefined && (
              <Button onClick={() => handleSave(sec.id, sec.section)} disabled={saving[sec.id]}>
                <Save className="h-4 w-4 mr-1" />
                {saving[sec.id] ? "..." : "Save"}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function HeroEditor({ content, onChange }: { content: Record<string, unknown>; onChange: (json: string) => void }) {
  const [local, setLocal] = useState(content as Record<string, string>);

  const update = (key: string, value: string) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    onChange(JSON.stringify(next));
  };

  return (
    <div className="space-y-3">
      {(["title_vi", "title_en", "subtitle_vi", "subtitle_en", "cta_vi", "cta_en", "image_url"] as const).map(key => (
        <div key={key}>
          <Label className="text-xs text-gray-500">{key}</Label>
          <Input
            value={(local[key] as string) || ""}
            onChange={e => update(key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
