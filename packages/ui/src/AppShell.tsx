"use client";

import { useState, useCallback } from "react";

interface AppShellProps {
  /** App title shown in the mobile header */
  title: string;
  /** Sidebar content — receives onClose to dismiss mobile drawer on nav */
  renderSidebar: (props: { onClose: () => void }) => React.ReactNode;
  children: React.ReactNode;
}

/**
 * Shared app shell: sticky sidebar on desktop, slide-in drawer on mobile.
 *
 * Themed via CSS custom properties on the host page. Supports both naming
 * conventions (ShadCN-style and --color-* style) with fallbacks:
 *
 *   --sidebar / --color-sidebar-bg   Sidebar background
 *   --card / --color-surface          Mobile header background
 *   --border / --color-border         Border color
 *   --background / --color-bg         Page background
 *   --foreground / --color-text       Text color
 *   --sidebar-width                   Desktop sidebar width (default 15rem)
 *   --header-height                   Mobile header height (default 3.5rem)
 *   --space-3, --space-4, --space-6, --space-8   Spacing tokens
 *   --shadow-lg                       Sidebar shadow on mobile
 *   --transition-normal               Slide animation duration
 */
export function AppShell({ title, renderSidebar, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(
    () => setSidebarOpen((prev) => !prev),
    []
  );

  return (
    <>
      <style>{shellCSS}</style>
      <div data-shell="">
        {/* Mobile header — hidden on desktop via CSS */}
        <header data-shell-header="">
          <button
            data-shell-hamburger=""
            onClick={toggleSidebar}
            aria-label="Toggle navigation"
          >
            <span />
            <span />
            <span />
          </button>
          <span data-shell-title="">{title}</span>
        </header>

        {/* Backdrop — only rendered when sidebar open, hidden on desktop */}
        {sidebarOpen && (
          <div data-shell-backdrop="" onClick={closeSidebar} />
        )}

        {/* Sidebar wrapper — sticky on desktop, slide-in drawer on mobile */}
        <aside
          data-shell-sidebar=""
          {...(sidebarOpen ? { "data-open": "" } : {})}
        >
          {renderSidebar({ onClose: closeSidebar })}
        </aside>

        {/* Main content */}
        <main data-shell-content="">{children}</main>
      </div>
    </>
  );
}

const shellCSS = /* css */ `
[data-shell] {
  display: flex;
  min-height: 100vh;
  background: var(--background, var(--color-bg, #fff));
}

/* ---- Mobile header ---- */
[data-shell-header] {
  display: none;
}
[data-shell-hamburger] {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 2rem;
  height: 2rem;
  padding: 0.25rem;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 4px;
}
[data-shell-hamburger]:hover {
  background: var(--accent, var(--color-primary-light, rgba(0,0,0,0.06)));
}
[data-shell-hamburger] span {
  display: block;
  width: 100%;
  height: 2px;
  background: var(--foreground, var(--color-text, #333));
  border-radius: 1px;
}
[data-shell-title] {
  font-family: var(--font-heading, Georgia, serif);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--foreground, var(--color-text, #333));
}

/* ---- Backdrop ---- */
[data-shell-backdrop] {
  display: none;
}

/* ---- Sidebar ---- */
[data-shell-sidebar] {
  width: var(--sidebar-width, 15rem);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  background: var(--sidebar, var(--color-sidebar-bg, #faf6f1));
  border-right: 1px solid var(--border, var(--color-border, #e5e5e5));
  padding: var(--space-6, 1.5rem) 0;
}

/* ---- Content ---- */
[data-shell-content] {
  flex: 1;
  min-width: 0;
  padding: var(--space-6, 1.5rem) var(--space-8, 2rem);
}

/* ---- Mobile ---- */
@media (max-width: 767px) {
  [data-shell-header] {
    display: flex;
    align-items: center;
    gap: var(--space-3, 0.75rem);
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: var(--header-height, 3.5rem);
    padding: 0 var(--space-4, 1rem);
    background: var(--card, var(--color-surface, #fff));
    border-bottom: 1px solid var(--border, var(--color-border, #e5e5e5));
    z-index: 100;
  }

  [data-shell-sidebar] {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 200;
    width: 16rem;
    transform: translateX(-100%);
    transition: transform var(--transition-normal, 250ms ease);
    box-shadow: none;
  }
  [data-shell-sidebar][data-open] {
    transform: translateX(0);
    box-shadow: var(--shadow-lg, 0 4px 16px rgba(0,0,0,0.1));
  }

  [data-shell-backdrop] {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 199;
  }

  [data-shell-content] {
    padding: var(--space-4, 1rem);
    padding-top: calc(var(--header-height, 3.5rem) + var(--space-4, 1rem));
  }
}
`;
