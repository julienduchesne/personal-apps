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

const switcherStyle = {
  "--switcher-border": "var(--border)",
  "--switcher-text": "var(--foreground)",
  "--switcher-bg-hover": "var(--accent)",
  "--switcher-dropdown-bg": "var(--card)",
  "--switcher-item-hover": "var(--accent)",
  "--switcher-item-active": "rgba(212, 118, 44, 0.06)",
  "--switcher-shadow": "var(--shadow-md)",
} as React.CSSProperties;

export function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`
        w-[var(--sidebar-width)] shrink-0 bg-sidebar border-r border-border
        p-[var(--space-6)] pr-0 flex flex-col sticky top-0 h-screen overflow-y-auto
        max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-[200]
        max-md:w-64 max-md:shadow-none max-md:transition-transform max-md:duration-[var(--transition-normal)]
        ${isOpen ? "max-md:translate-x-0 max-md:shadow-lg" : "max-md:-translate-x-full"}
      `}
    >
      <div className="px-[var(--space-3)] mb-[var(--space-4)]" style={switcherStyle}>
        <AppSwitcher apps={APPS} />
      </div>

      <nav className="space-y-[var(--space-1)] flex-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-[var(--space-3)] px-[var(--space-5)] py-[var(--space-3)] mx-[var(--space-2)] rounded-[var(--radius-md)] text-[0.9375rem] font-medium no-underline transition-all duration-[var(--transition-fast)] ${
                active
                  ? "bg-accent text-primary font-semibold"
                  : "text-muted-foreground hover:bg-[rgba(212,118,44,0.06)] hover:text-foreground"
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
