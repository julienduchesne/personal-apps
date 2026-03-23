"use client";

import { usePathname } from "next/navigation";
import { useState, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import styles from "./AppShell.module.css";
import type { PlaytimeSession } from "@/lib/types";

export function AppShell({
  children,
  activeSession,
}: {
  children: React.ReactNode;
  activeSession: PlaytimeSession | null;
}) {
  const pathname = usePathname();
  const isAuth = pathname === "/auth";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);

  if (isAuth) {
    return <>{children}</>;
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.mobileHeader}>
        <button
          className={styles.hamburger}
          onClick={toggleSidebar}
          aria-label="Toggle navigation"
        >
          <span className={styles.hamburgerLine} />
          <span className={styles.hamburgerLine} />
          <span className={styles.hamburgerLine} />
        </button>
        <span className={styles.mobileTitle}>Guitar Practice</span>
      </header>

      {sidebarOpen && (
        <div className={styles.backdrop} onClick={closeSidebar} />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} activeSession={activeSession} />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
