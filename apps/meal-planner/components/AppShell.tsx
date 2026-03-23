"use client";

import { AppShell as Shell } from "@repo/ui";
import { SidebarContent } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Shell
      title="Meal Planner"
      renderSidebar={({ onClose }) => <SidebarContent onClose={onClose} />}
    >
      {children}
    </Shell>
  );
}
