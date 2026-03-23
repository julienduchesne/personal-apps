"use client";

import { useState, useRef, useEffect } from "react";

export interface AppConfig {
  name: string;
  icon: string;
  url: string;
  active?: boolean;
}

function AppIcon({ src, size = 20 }: { src: string; size?: number }) {
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      style={{ borderRadius: 4, flexShrink: 0 }}
    />
  );
}

/**
 * Theme via CSS custom properties on a parent element:
 *   --switcher-bg          Button background (default: transparent)
 *   --switcher-bg-hover    Button hover background
 *   --switcher-border      Border color
 *   --switcher-text        Text color
 *   --switcher-dropdown-bg Dropdown background
 *   --switcher-item-hover  Dropdown item hover
 *   --switcher-item-active Active item background
 *   --switcher-shadow      Dropdown shadow
 */
export function AppSwitcher({ apps }: { apps: AppConfig[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const current = apps.find((a) => a.active);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Switch app"
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.375rem 0.625rem",
          borderRadius: "0.5rem",
          border: "1px solid var(--switcher-border, rgba(0,0,0,0.12))",
          background: "var(--switcher-bg, transparent)",
          color: "var(--switcher-text, inherit)",
          cursor: "pointer",
          fontSize: "0.8125rem",
          width: "100%",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background =
            getComputedStyle(e.currentTarget).getPropertyValue("--switcher-bg-hover").trim() ||
            "rgba(0,0,0,0.06)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background =
            getComputedStyle(e.currentTarget).getPropertyValue("--switcher-bg").trim() ||
            "transparent")
        }
      >
        {current ? <AppIcon src={current.icon} /> : null}
        <span style={{ flex: 1, textAlign: "left", fontWeight: 500 }}>
          {current?.name ?? "Switch app"}
        </span>
        <span style={{ fontSize: "0.625rem", opacity: 0.5 }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 0.25rem)",
            left: 0,
            right: 0,
            background: "var(--switcher-dropdown-bg, #fff)",
            border: "1px solid var(--switcher-border, rgba(0,0,0,0.12))",
            borderRadius: "0.5rem",
            overflow: "hidden",
            zIndex: 50,
            boxShadow: "var(--switcher-shadow, 0 4px 12px rgba(0,0,0,0.12))",
          }}
        >
          {apps.map((app) => (
            <a
              key={app.name}
              href={app.url}
              onClick={() => setOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 0.625rem",
                color: "var(--switcher-text, inherit)",
                textDecoration: "none",
                fontSize: "0.8125rem",
                background: app.active
                  ? "var(--switcher-item-active, rgba(0,0,0,0.05))"
                  : "transparent",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  getComputedStyle(e.currentTarget).getPropertyValue("--switcher-item-hover").trim() ||
                  "rgba(0,0,0,0.08)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = app.active
                  ? getComputedStyle(e.currentTarget).getPropertyValue("--switcher-item-active").trim() ||
                    "rgba(0,0,0,0.05)"
                  : "transparent")
              }
            >
              <AppIcon src={app.icon} />
              <span style={{ flex: 1 }}>{app.name}</span>
              {app.active && (
                <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>✓</span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
