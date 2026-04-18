"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { User, Shield, Key, Monitor, Plug, MessageCircle, Globe, FileText } from "lucide-react";

const settingsTabs = [
  { key: "profile", href: "/settings", icon: User },
  { key: "businessRules", href: "/settings/business-rules", icon: Shield },
  { key: "apiKeys", href: "/settings/api-keys", icon: Key },
  { key: "system", href: "/settings/system", icon: Monitor },
  { key: "dataProtection", href: "/settings/data-protection", icon: FileText },
  { key: "integrations", href: "/settings/integrations", icon: Plug },
  { key: "landingPage", href: "/settings/landing-page", icon: Globe },
  { key: "chatConfig", href: "/settings/chat", icon: MessageCircle },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("settings");
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <div className="border-b">
        <nav className="flex gap-1 overflow-x-auto pb-px" aria-label="Settings tabs">
          {settingsTabs.map((tab) => {
            const active = tab.href === "/settings"
              ? pathname === "/settings"
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.key}
                href={tab.href}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-red-600 text-red-700"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {t(`tabs.${tab.key}`)}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
