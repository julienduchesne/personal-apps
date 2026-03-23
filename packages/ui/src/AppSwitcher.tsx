"use client";

import { useState, useRef, useEffect } from "react";

export interface AppConfig {
  name: string;
  emoji: string;
  url: string;
  active?: boolean;
}

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
          border: "1px solid rgba(255,255,255,0.15)",
          background: "rgba(255,255,255,0.08)",
          color: "inherit",
          cursor: "pointer",
          fontSize: "0.8125rem",
          width: "100%",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.15)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "rgba(255,255,255,0.08)")
        }
      >
        <span style={{ fontSize: "1.125rem" }}>{current?.emoji ?? "🔀"}</span>
        <span style={{ flex: 1, textAlign: "left" }}>
          {current?.name ?? "Switch app"}
        </span>
        <span style={{ fontSize: "0.625rem", opacity: 0.6 }}>
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
            background: "#1a1a2e",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "0.5rem",
            overflow: "hidden",
            zIndex: 50,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
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
                color: "inherit",
                textDecoration: "none",
                fontSize: "0.8125rem",
                background: app.active
                  ? "rgba(255,255,255,0.1)"
                  : "transparent",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.18)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = app.active
                  ? "rgba(255,255,255,0.1)"
                  : "transparent")
              }
            >
              <span style={{ fontSize: "1.125rem" }}>{app.emoji}</span>
              <span style={{ flex: 1 }}>{app.name}</span>
              {app.active && (
                <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>✓</span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
