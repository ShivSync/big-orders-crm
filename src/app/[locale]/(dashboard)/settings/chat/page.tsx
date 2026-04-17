"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, MessageSquare, Save, Trash2 } from "lucide-react";

interface FAQ {
  id: string;
  question_vi: string;
  question_en: string;
  answer_vi: string;
  answer_en: string;
  keywords: string[];
  category: string;
  active: boolean;
}

interface ChatSession {
  id: string;
  visitor_name: string | null;
  visitor_phone: string | null;
  status: string;
  created_at: string;
  lead_id: string | null;
}

export default function ChatSettingsPage() {
  const t = useTranslations("settings");
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newFaq, setNewFaq] = useState({ question_vi: "", question_en: "", answer_vi: "", answer_en: "", keywords: "", category: "general" });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const [faqRes, sessRes] = await Promise.all([
      fetch("/api/settings/chat-faq"),
      fetch("/api/settings/chat-sessions"),
    ]);
    if (faqRes.ok) {
      const d = await faqRes.json();
      setFaqs(d.data || []);
    }
    if (sessRes.ok) {
      const d = await sessRes.json();
      setSessions(d.data || []);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateFaq = async () => {
    setSaving(true);
    const res = await fetch("/api/settings/chat-faq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newFaq,
        keywords: newFaq.keywords.split(",").map(k => k.trim()).filter(Boolean),
      }),
    });
    if (res.ok) {
      setDialogOpen(false);
      setNewFaq({ question_vi: "", question_en: "", answer_vi: "", answer_en: "", keywords: "", category: "general" });
      loadData();
    }
    setSaving(false);
  };

  const handleDeleteFaq = async (id: string) => {
    await fetch("/api/settings/chat-faq", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadData();
  };

  const escalatedCount = sessions.filter(s => s.status === "escalated").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Chat & FAQ Management</h1>

      {/* Chat Sessions Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{sessions.length}</div>
            <div className="text-sm text-muted-foreground">Total Sessions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-orange-600">{escalatedCount}</div>
            <div className="text-sm text-muted-foreground">Escalated</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">{sessions.filter(s => s.lead_id).length}</div>
            <div className="text-sm text-muted-foreground">Leads Created</div>
          </CardContent>
        </Card>
      </div>

      {/* Escalated Sessions */}
      {escalatedCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-orange-600" />
              Escalated Chats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sessions.filter(s => s.status === "escalated").map(s => (
                <div key={s.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <span className="font-medium">{s.visitor_name || "Anonymous"}</span>
                    {s.visitor_phone && <span className="ml-2 text-sm text-muted-foreground">{s.visitor_phone}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-orange-600 border-orange-200">Escalated</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleString("vi-VN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* FAQ Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Bot FAQ</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add FAQ</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add FAQ Entry</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Question (VI)</Label>
                  <Input value={newFaq.question_vi} onChange={e => setNewFaq(f => ({ ...f, question_vi: e.target.value }))} />
                </div>
                <div>
                  <Label>Question (EN)</Label>
                  <Input value={newFaq.question_en} onChange={e => setNewFaq(f => ({ ...f, question_en: e.target.value }))} />
                </div>
                <div>
                  <Label>Answer (VI)</Label>
                  <Textarea value={newFaq.answer_vi} onChange={e => setNewFaq(f => ({ ...f, answer_vi: e.target.value }))} rows={3} />
                </div>
                <div>
                  <Label>Answer (EN)</Label>
                  <Textarea value={newFaq.answer_en} onChange={e => setNewFaq(f => ({ ...f, answer_en: e.target.value }))} rows={3} />
                </div>
                <div>
                  <Label>Keywords (comma-separated)</Label>
                  <Input value={newFaq.keywords} onChange={e => setNewFaq(f => ({ ...f, keywords: e.target.value }))} placeholder="giá, price, bao nhiêu" />
                </div>
                <Button onClick={handleCreateFaq} disabled={saving} className="w-full">
                  <Save className="h-4 w-4 mr-1" /> {saving ? "..." : "Save"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {faqs.map(faq => (
              <div key={faq.id} className="rounded border p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{faq.question_vi}</div>
                    <div className="text-sm text-muted-foreground">{faq.question_en}</div>
                    <div className="mt-1 text-sm text-gray-700">{faq.answer_vi}</div>
                    <div className="mt-1 flex gap-1 flex-wrap">
                      {faq.keywords.map((kw, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteFaq(faq.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            {faqs.length === 0 && <p className="text-center text-muted-foreground py-4">No FAQ entries yet</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
