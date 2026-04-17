"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "@/i18n/routing";
import {
  Radio, MessageSquare, Phone, Mail, ArrowDownLeft, ArrowUpRight,
  Inbox, Send, Eye, PhoneIncoming,
} from "lucide-react";
import type { ChannelMessage, ChannelType } from "@/types/database";

const CHANNELS: (ChannelType | "all")[] = ["all", "zalo", "facebook", "sms", "email", "phone"];

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

export default function ChannelsPage() {
  const t = useTranslations("channels");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ChannelType | "all">("all");
  const [stats, setStats] = useState({ total: 0, unread: 0, inboundToday: 0, outboundToday: 0 });

  const loc = locale === "vi" ? "vi-VN" : "en-US";
  const dateTimeOpts: Intl.DateTimeFormatOptions = {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  };

  const loadMessages = useCallback(async () => {
    let query = supabase
      .from("channel_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (filter !== "all") {
      query = query.eq("channel", filter);
    }

    const { data } = await query;
    setMessages(data ?? []);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const all = data ?? [];
    setStats({
      total: all.length,
      unread: all.filter((m) => !m.read && m.direction === "inbound").length,
      inboundToday: all.filter((m) => m.direction === "inbound" && m.created_at >= todayIso).length,
      outboundToday: all.filter((m) => m.direction === "outbound" && m.created_at >= todayIso).length,
    });

    setLoading(false);
  }, [filter]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const subscription = supabase
      .channel("channel-messages-inbox")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "channel_messages" },
        () => { loadMessages(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [loadMessages]);

  function navigateToEntity(msg: ChannelMessage) {
    if (msg.lead_id) router.push(`/leads/${msg.lead_id}`);
    else if (msg.customer_id) router.push(`/customers/${msg.customer_id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Inbox className="h-8 w-8 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">{t("totalMessages")}</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Eye className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500">{t("unreadMessages")}</p>
              <p className="text-xl font-bold text-blue-600">{stats.unread}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ArrowDownLeft className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-gray-500">{t("inboundToday")}</p>
              <p className="text-xl font-bold text-green-600">{stats.inboundToday}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ArrowUpRight className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-gray-500">{t("outboundToday")}</p>
              <p className="text-xl font-bold text-purple-600">{stats.outboundToday}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("messages")}</CardTitle>
            <Select value={filter} onValueChange={(v) => setFilter(v as ChannelType | "all")}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((ch) => (
                  <SelectItem key={ch} value={ch}>
                    {ch === "all" ? t("allChannels") : t(ch)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-6">{tCommon("loading")}</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">{t("noMessages")}</p>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => {
                const Icon = channelIcons[msg.channel];
                const DirIcon = msg.direction === "inbound" ? ArrowDownLeft : ArrowUpRight;
                const isUnread = !msg.read && msg.direction === "inbound";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${isUnread ? "bg-blue-50 border-blue-200" : ""}`}
                    onClick={() => navigateToEntity(msg)}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${channelColors[msg.channel]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{t(msg.channel)}</Badge>
                        <DirIcon className={`h-3 w-3 ${msg.direction === "inbound" ? "text-green-500" : "text-gray-400"}`} />
                        {msg.sender_name && <span className="text-sm font-medium">{msg.sender_name}</span>}
                        {msg.sender_phone && <span className="text-xs text-gray-500">{msg.sender_phone}</span>}
                        {isUnread && <Badge className="bg-blue-500 text-white text-xs ml-auto">{t("unread")}</Badge>}
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5 truncate">{msg.content}</p>
                      <span className="text-xs text-gray-400">
                        {new Date(msg.created_at).toLocaleDateString(loc, dateTimeOpts)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
