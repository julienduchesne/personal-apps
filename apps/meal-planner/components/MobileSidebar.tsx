"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Link } from "./Link";
import { Button } from "@/components/ui/button";
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

export function MobileSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between bg-card border-b border-border px-4 py-3">
        <Link href="/week" className="flex items-center gap-2 no-underline">
          <span className="text-xl">🍽️</span>
          <span className="font-heading font-bold text-foreground">Meal Planner</span>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(!open)}
          className="text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          {open ? "✕" : "☰"}
        </Button>
      </div>

      {open && (
        <nav className="bg-card border-b border-border px-4 py-2 space-y-1">
          <div
            className="py-1 text-muted-foreground"
            style={{
              "--switcher-border": "var(--border)",
              "--switcher-text": "var(--foreground)",
              "--switcher-bg-hover": "var(--accent)",
              "--switcher-dropdown-bg": "var(--card)",
              "--switcher-item-hover": "var(--accent)",
              "--switcher-item-active": "rgba(212, 118, 44, 0.06)",
              "--switcher-shadow": "var(--shadow-md)",
            } as React.CSSProperties}
          >
            <AppSwitcher apps={APPS} />
          </div>
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium no-underline transition-colors ${
                  active
                    ? "bg-accent text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <span>{item.emoji}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
