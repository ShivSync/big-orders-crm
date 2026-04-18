"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, UserCog, UsersRound, Settings,
  Target, Building2, ShoppingCart, Megaphone, MapPin, BarChart3, Kanban,
  Radio, HelpCircle,
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
      { key: "reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    items: [
      { key: "users", href: "/users", icon: UserCog },
      { key: "roles", href: "/roles", icon: UsersRound },
      { key: "teams", href: "/teams", icon: UsersRound },
      { key: "settings", href: "/settings", icon: Settings },
      { key: "help", href: "/help", icon: HelpCircle },
    ],
  },
];

export function MobileMenuButton() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 text-gray-600 hover:text-gray-900"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl flex flex-col md:hidden">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-red-600 text-xs font-bold text-white">
                  KFC
                </div>
                <span className="font-semibold text-sm">Big Orders CRM</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
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
        </>
      )}
    </>
  );
}

export function Sidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex h-full w-60 flex-col border-r bg-white">
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
