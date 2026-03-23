"use client";

import { usePathname } from "next/navigation";
import { Link } from "./Link";
import { AppSwitcher, APP_ICONS } from "@repo/ui";

const APPS = [
  { name: "Meal Planner", icon: APP_ICONS.mealPlanner, url: "/", active: true },
  { name: "Guitar Practice", icon: APP_ICONS.guitarPractice, url: process.env.NEXT_PUBLIC_GUITAR_URL ?? "http://localhost:3001" },
];

const NAV_ITEMS = [
  { href: "/week", label: "Week", emoji: "📅" },
  { href: "/recipes", label: "Recipes", emoji: "📖" },
  { href: "/settings", label: "Settings", emoji: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-gradient-to-b from-red-900 via-red-800 to-orange-900 border-r border-red-950 p-4 flex flex-col">
      <div
        className="mb-6 px-1"
        style={{
          "--switcher-bg": "rgba(255,255,255,0.08)",
          "--switcher-bg-hover": "rgba(255,255,255,0.15)",
          "--switcher-border": "rgba(255,255,255,0.15)",
          "--switcher-text": "#fde68a",
          "--switcher-dropdown-bg": "rgba(80,20,10,0.95)",
          "--switcher-item-hover": "rgba(255,255,255,0.12)",
          "--switcher-item-active": "rgba(255,255,255,0.08)",
          "--switcher-shadow": "0 4px 12px rgba(0,0,0,0.3)",
        } as React.CSSProperties}
      >
        <AppSwitcher apps={APPS} />
      </div>

      <nav className="space-y-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? "bg-white/15 text-amber-100"
                  : "text-red-200/80 hover:bg-white/10 hover:text-amber-100"
              }`}
            >
              <span>{item.emoji}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
