"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radio, MessageSquare, Phone, PhoneIncoming, Mail, Send, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { ChannelMessage, ChannelType } from "@/types/database";

const channelIcons: Record<ChannelType, typeof Radio> = {
  zalo: MessageSquare,
  facebook: MessageSquare,
  sms: Phone,
  email: Mail,
  phone: PhoneIncoming,
};

const channelColors: Record<ChannelType, string> = {
  zalo: "bg-blue-100 text-blue-700",
  facebook: "bg-indigo-100 text-indigo-700",
  sms: "bg-green-100 text-green-700",
  email: "bg-orange-100 text-orange-700",
  phone: "bg-red-100 text-red-700",
};

interface ChannelMessagesPanelProps {
  entityType: "lead" | "customer";
  entityId: string;
}

export function ChannelMessagesPanel({ entityType, entityId }: ChannelMessagesPanelProps) {
  const t = useTranslations("channels");
  const locale = useLocale();
  const supabase = createClient();
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const loc = locale === "vi" ? "vi-VN" : "en-US";
  const dateTimeOpts: Intl.DateTimeFormatOptions = {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  };

  const loadMessages = useCallback(async () => {
    const column = entityType === "lead" ? "lead_id" : "customer_id";
    const { data } = await supabase
      .from("channel_messages")
      .select("*")
      .eq(column, entityId)
      .order("created_at", { ascending: false })
      .limit(50);
    setMessages(data ?? []);
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => {
    loadMessages();

    const column = entityType === "lead" ? "lead_id" : "customer_id";
    const subscription = supabase
      .channel(`channel-messages-${entityId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "channel_messages",
          filter: `${column}=eq.${entityId}`,
        },
        (payload) => {
          setMessages((prev) => [payload.new as ChannelMessage, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [loadMessages, entityId, entityType]);

  async function markAsRead(id: string) {
    await fetch("/api/channels/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, read: true } : m));
  }

  if (loading) {
    return <p className="text-sm text-gray-400 text-center py-6">...</p>;
  }

  if (messages.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">{t("noMessages")}</p>;
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => {
        const Icon = channelIcons[msg.channel];
        const DirIcon = msg.direction === "inbound" ? ArrowDownLeft : ArrowUpRight;
        return (
          <div
            key={msg.id}
            className={`flex gap-3 p-3 rounded-lg border ${!msg.read && msg.direction === "inbound" ? "bg-blue-50 border-blue-200" : ""}`}
          >
            <div className="flex-shrink-0 mt-0.5">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full ${channelColors[msg.channel]}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{t(msg.channel)}</Badge>
                <DirIcon className={`h-3 w-3 ${msg.direction === "inbound" ? "text-green-500" : "text-gray-400"}`} />
                <span className="text-xs text-gray-400">
                  {new Date(msg.created_at).toLocaleDateString(loc, dateTimeOpts)}
                </span>
                {!msg.read && msg.direction === "inbound" && (
                  <Badge className="bg-blue-500 text-white text-xs">{t("unread")}</Badge>
                )}
              </div>
              {msg.sender_name && (
                <p className="text-xs text-gray-500 mt-0.5">{msg.sender_name} {msg.sender_phone ? `(${msg.sender_phone})` : ""}</p>
              )}
              <p className="text-sm mt-1">{msg.content}</p>
              {!msg.read && msg.direction === "inbound" && (
                <Button variant="ghost" size="sm" className="text-xs mt-1 h-6 px-2" onClick={() => markAsRead(msg.id)}>
                  {t("markRead")}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
