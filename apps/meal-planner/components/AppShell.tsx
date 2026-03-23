"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile header */}
      <header className="hidden max-md:flex items-center gap-[var(--space-3)] fixed top-0 left-0 right-0 h-[var(--header-height)] px-[var(--space-4)] bg-card border-b border-border z-[100]">
        <button
          className="flex flex-col justify-center gap-1 w-8 h-8 p-[var(--space-1)] bg-transparent border-none cursor-pointer rounded-[var(--radius-sm)] hover:bg-accent"
          onClick={toggleSidebar}
          aria-label="Toggle navigation"
        >
          <span className="block w-full h-0.5 bg-foreground rounded-sm" />
          <span className="block w-full h-0.5 bg-foreground rounded-sm" />
          <span className="block w-full h-0.5 bg-foreground rounded-sm" />
        </button>
        <span className="font-heading text-lg font-semibold text-foreground">
          Meal Planner
        </span>
      </header>

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="hidden max-md:block fixed inset-0 bg-black/30 z-[199]"
          onClick={closeSidebar}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <main className="flex-1 min-w-0 p-[var(--space-6)] md:p-[var(--space-8)] max-md:pt-[calc(var(--header-height)+var(--space-4))]">
        {children}
      </main>
    </div>
  );
}
