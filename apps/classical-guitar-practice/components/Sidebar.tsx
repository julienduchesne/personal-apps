"use client";

import { Link } from "@/components/Link";
import { usePathname } from "next/navigation";
import { PlaytimeButton } from "@/components/PlaytimeButton";
import { AppSwitcher } from "@repo/ui";
import styles from "./Sidebar.module.css";
import type { PlaytimeSession } from "@/lib/types";

const APPS = [
  { name: "Meal Planner", emoji: "🍽️", url: process.env.NEXT_PUBLIC_MEALS_URL ?? "http://localhost:3000" },
  { name: "Guitar Practice", emoji: "🎸", url: "/", active: true },
];

type NavItem = { href: string; label: string; exact?: boolean; sub?: boolean };

const nav: NavItem[] = [
  { href: "/exercises", label: "Exercises", exact: true },
  { href: "/exercises/daily-pick", label: "Daily pick", sub: true },
  { href: "/pieces", label: "Pieces" },
  { href: "/playtime", label: "Playtime" },
];

export function Sidebar({
  isOpen,
  onClose,
  activeSession,
}: {
  isOpen: boolean;
  onClose: () => void;
  activeSession: PlaytimeSession | null;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}
    >
      <button
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Close navigation"
      >
        ✕
      </button>

      <div className={styles.appSwitcher}>
        <AppSwitcher apps={APPS} />
      </div>

      <ul className={styles.navList}>
        {nav.map(({ href, label, exact, sub }) => {
          const isActive = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className={styles.navItem}>
              <Link
                href={href}
                className={`${sub ? styles.navSubLink : styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
                onClick={onClose}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className={styles.playtimeDivider} />
      <div className={styles.playtimeSection}>
        <PlaytimeButton activeSession={activeSession ?? null} />
      </div>
    </nav>
  );
}
