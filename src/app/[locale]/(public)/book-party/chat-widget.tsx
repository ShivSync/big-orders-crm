"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, User, Bot } from "lucide-react";

interface Message {
  id: string;
  sender: "visitor" | "bot" | "agent";
  content: string;
  time: string;
}

type BotStep = "idle" | "greeting" | "ask_event_type" | "ask_guest_count" | "ask_contact" | "thank_you" | "faq" | "faq_not_found" | "escalated";

export function ChatWidget() {
  const t = useTranslations("chat");
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [step, setStep] = useState<BotStep>("idle");
  const [sending, setSending] = useState(false);
  const [collected, setCollected] = useState<{ event_type?: string; guest_count?: string }>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const addMessage = useCallback((sender: Message["sender"], content: string) => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      sender,
      content,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    }]);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const startChat = async () => {
    setOpen(true);
    if (sessionId) return;

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });

    if (res.ok) {
      const data = await res.json();
      setSessionId(data.session_id);
      setVisitorId(data.visitor_id);
      setStep("greeting");
      addMessage("bot", t("greeting"));

      setTimeout(() => {
        addMessage("bot", t("askEventType"));
        setStep("ask_event_type");
      }, 1500);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId || sending) return;

    const msg = input.trim();
    setInput("");
    addMessage("visitor", msg);
    setSending(true);

    if (step === "ask_event_type") {
      setCollected(prev => ({ ...prev, event_type: msg }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "message", session_id: sessionId, visitor_id: visitorId, content: msg, step: "ask_event_type" }),
      });
      if (res.ok) {
        setTimeout(() => {
          addMessage("bot", t("askGuestCount"));
          setStep("ask_guest_count");
        }, 800);
      }
    } else if (step === "ask_guest_count") {
      setCollected(prev => ({ ...prev, guest_count: msg }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "message", session_id: sessionId, visitor_id: visitorId, content: msg, step: "ask_guest_count" }),
      });
      if (res.ok) {
        setTimeout(() => {
          addMessage("bot", t("askContact"));
          setStep("ask_contact");
        }, 800);
      }
    } else if (step === "ask_contact") {
      const parts = msg.split(/[,\n]+/).map(s => s.trim());
      const name = parts[0] || msg;
      const phoneMatch = msg.match(/[\d+\-()]{8,20}/);
      const phone = phoneMatch ? phoneMatch[0] : parts[1] || "";

      if (name && phone) {
        await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_lead",
            session_id: sessionId,
            visitor_id: visitorId,
            name,
            phone,
            event_type: collected.event_type,
            guest_count: collected.guest_count,
          }),
        });
        setTimeout(() => {
          addMessage("bot", t("thankYou"));
          setStep("thank_you");
        }, 800);
      } else {
        addMessage("bot", t("askContact"));
      }
    } else {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "message", session_id: sessionId, visitor_id: visitorId, content: msg }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          setTimeout(() => {
            const replyStep = data.reply.metadata?.step;
            if (replyStep === "escalated") {
              addMessage("bot", t("escalated"));
              setStep("escalated");
            } else if (replyStep === "faq_not_found") {
              addMessage("bot", t("faqNotFound"));
              setStep("faq_not_found");
            } else if (replyStep === "faq") {
              addMessage("bot", data.reply.content);
              setStep("faq");
            }
          }, 800);
        }
      }
    }

    setSending(false);
  };

  const handleEscalate = async () => {
    if (!sessionId) return;
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "escalate", session_id: sessionId, visitor_id: visitorId }),
    });
    addMessage("bot", t("escalated"));
    setStep("escalated");
  };

  if (!open) {
    return (
      <button
        onClick={startChat}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-700 hover:scale-105"
        aria-label="Chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-80 flex-col rounded-2xl bg-white shadow-2xl border md:w-96" style={{ height: "min(500px, 80vh)" }}>
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-2xl bg-red-600 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-bold text-red-600">
            KFC
          </div>
          <div>
            <div className="text-sm font-semibold">{t("title")}</div>
            <div className="flex items-center gap-1 text-xs opacity-80">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              {t("online")}
            </div>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-red-700">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.sender === "visitor" ? "flex-row-reverse" : ""}`}>
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
              msg.sender === "visitor" ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-600"
            }`}>
              {msg.sender === "visitor" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
              msg.sender === "visitor"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-800"
            }`}>
              {msg.content}
              <div className={`mt-1 text-[10px] ${msg.sender === "visitor" ? "text-blue-200" : "text-gray-400"}`}>
                {msg.time}
              </div>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Bot className="h-4 w-4" />
            {t("typing")}
          </div>
        )}
      </div>

      {/* Escalate button */}
      {(step === "faq_not_found" || step === "faq") && (
        <div className="px-3 pb-2">
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleEscalate}>
            {t("talkToHuman")}
          </Button>
        </div>
      )}

      {/* Input */}
      {step !== "thank_you" && step !== "escalated" && (
        <div className="flex items-center gap-2 border-t p-3">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder={t("placeholder")}
            className="text-sm"
            disabled={sending}
          />
          <Button size="sm" onClick={handleSend} disabled={!input.trim() || sending} className="bg-red-600 hover:bg-red-700">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
