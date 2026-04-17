"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, UserCog, UsersRound, Settings, Package,
  Target, Building2, ShoppingCart, Megaphone, MapPin, BarChart3, Kanban,
  MessageCircle, Radio, HelpCircle, Plug,
} from "lucide-react";

const navSections = [
  {
    items: [
      { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    items: [
      { key: "leads", href: "/leads", icon: Target },
      { key: "pipeline", href: "/pipeline", icon: Kanban },
      { key: "customers", href: "/customers", icon: Users },
      { key: "organizations", href: "/organizations", icon: Building2 },
      { key: "orders", href: "/orders", icon: ShoppingCart },
    ],
  },
  {
    items: [
      { key: "discovery", href: "/discovery", icon: MapPin },
      { key: "campaigns", href: "/campaigns", icon: Megaphone },
      { key: "channels", href: "/channels", icon: Radio },
      { key: "chatAdmin", href: "/settings/chat", icon: MessageCircle },
      { key: "reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    items: [
      { key: "users", href: "/users", icon: UserCog },
      { key: "roles", href: "/roles", icon: UsersRound },
      { key: "teams", href: "/teams", icon: UsersRound },
      { key: "settings", href: "/settings", icon: Settings },
      { key: "integrations", href: "/settings/integrations", icon: Plug },
      { key: "help", href: "/help", icon: HelpCircle },
    ],
  },
];

export function Sidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-white">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-red-600 text-xs font-bold text-white">
          KFC
        </div>
        <span className="font-semibold text-sm">Big Orders CRM</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {navSections.map((section, si) => (
          <div key={si} className={cn(si > 0 && "mt-2 border-t pt-2")}>
            {section.items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-red-50 text-red-700 font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {t(item.key)}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
