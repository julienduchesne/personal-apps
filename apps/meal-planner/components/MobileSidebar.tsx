"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Link } from "./Link";
import { Button } from "@/components/ui/button";
import { AppSwitcher } from "@repo/ui";

const APPS = [
  { name: "Meal Planner", emoji: "🍽️", url: "/", active: true },
  { name: "Guitar Practice", emoji: "🎸", url: process.env.NEXT_PUBLIC_GUITAR_URL ?? "http://localhost:3001" },
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
      <div className="flex items-center justify-between bg-gradient-to-r from-red-900 to-red-800 border-b border-red-950 px-4 py-3">
        <Link href="/week" className="flex items-center gap-2">
          <span className="text-xl">🍽️</span>
          <span className="font-bold text-amber-200">Meal Planner</span>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(!open)}
          className="text-amber-200 hover:text-white hover:bg-white/10"
        >
          {open ? "✕" : "☰"}
        </Button>
      </div>

      {open && (
        <nav className="bg-red-900/95 border-b border-red-950 px-4 py-2 space-y-1">
          <div className="py-1 text-amber-200">
            <AppSwitcher apps={APPS} />
          </div>
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/15 text-amber-100"
                    : "text-red-200/80 hover:bg-white/10"
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
