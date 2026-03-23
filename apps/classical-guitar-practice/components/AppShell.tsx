"use client";

import { usePathname } from "next/navigation";
import { AppShell as Shell } from "@repo/ui";
import { SidebarContent } from "@/components/Sidebar";
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

  if (isAuth) {
    return <>{children}</>;
  }

  return (
    <Shell
      title="Guitar Practice"
      renderSidebar={({ onClose }) => (
        <SidebarContent onClose={onClose} activeSession={activeSession} />
      )}
    >
      {children}
    </Shell>
  );
}
