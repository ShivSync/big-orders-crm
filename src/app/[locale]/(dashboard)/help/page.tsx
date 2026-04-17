"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, BookOpen, Target, Kanban, Users, Building2,
  ShoppingCart, Megaphone, MapPin, Radio, MessageCircle,
  Shield, Settings, Lightbulb, ChevronDown, ChevronRight,
} from "lucide-react";

interface GuideSection {
  key: string;
  icon: typeof BookOpen;
  color: string;
}

const GUIDE_SECTIONS: GuideSection[] = [
  { key: "gettingStarted", icon: BookOpen, color: "text-blue-600 bg-blue-100" },
  { key: "leadsGuide", icon: Target, color: "text-green-600 bg-green-100" },
  { key: "pipelineGuide", icon: Kanban, color: "text-purple-600 bg-purple-100" },
  { key: "customersGuide", icon: Users, color: "text-teal-600 bg-teal-100" },
  { key: "ordersGuide", icon: ShoppingCart, color: "text-red-600 bg-red-100" },
  { key: "campaignsGuide", icon: Megaphone, color: "text-orange-600 bg-orange-100" },
  { key: "discoveryGuide", icon: MapPin, color: "text-pink-600 bg-pink-100" },
  { key: "channelsGuide", icon: Radio, color: "text-indigo-600 bg-indigo-100" },
  { key: "chatGuide", icon: MessageCircle, color: "text-cyan-600 bg-cyan-100" },
  { key: "rolesGuide", icon: Shield, color: "text-amber-600 bg-amber-100" },
  { key: "settingsGuide", icon: Settings, color: "text-gray-600 bg-gray-100" },
];

const TIP_KEYS = ["tip1", "tip2", "tip3", "tip4", "tip5", "tip6", "tip7", "tip8"] as const;

export default function HelpPage() {
  const t = useTranslations("help");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const filteredSections = GUIDE_SECTIONS.filter((section) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const title = t(section.key).toLowerCase();
    const desc = t(`${section.key}Desc`).toLowerCase();
    const content = t(`${section.key}Content`).toLowerCase();
    return title.includes(q) || desc.includes(q) || content.includes(q);
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-3">
        {filteredSections.map((section) => {
          const Icon = section.icon;
          const isOpen = expanded.has(section.key);
          const Chevron = isOpen ? ChevronDown : ChevronRight;

          return (
            <Card key={section.key} className="overflow-hidden">
              <button
                onClick={() => toggle(section.key)}
                className="w-full text-left"
              >
                <CardHeader className="pb-2 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${section.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{t(section.key)}</CardTitle>
                      <p className="text-sm text-gray-500 mt-0.5">{t(`${section.key}Desc`)}</p>
                    </div>
                    <Chevron className="h-5 w-5 text-gray-400" />
                  </div>
                </CardHeader>
              </button>
              {isOpen && (
                <CardContent className="pt-0 pb-4">
                  <div className="pl-13 border-l-2 border-gray-100 ml-5 pl-8">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                      {t(`${section.key}Content`)}
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <CardTitle>{t("tips.title")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TIP_KEYS.map((key, i) => (
              <div key={key} className="flex gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-100">
                <Badge variant="outline" className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border-yellow-200">
                  {i + 1}
                </Badge>
                <p className="text-sm text-gray-700">{t(`tips.${key}`)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
