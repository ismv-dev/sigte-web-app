"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AppVersion,
  VERSION_LIST,
  VERSIONS,
  getRedirectForDisallowedRoute,
  isValidVersion,
  parseVersion,
} from "@/lib/versions";
import { useState, useRef, useEffect } from "react";
import { I } from "./Icon";

interface VersionSwitcherProps {
  currentVersion?: AppVersion;
  compact?: boolean;
}

export function VersionSwitcher({ currentVersion, compact = false }: VersionSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect current version from props or pathname
  const detectedVersion =
    currentVersion ||
    (isValidVersion(pathname.split("/")[1])
      ? (pathname.split("/")[1] as AppVersion)
      : "v3");

  const currentInfo = VERSIONS[detectedVersion];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(targetVersion: AppVersion) {
    setMenuOpen(false);
    if (targetVersion === detectedVersion) return;
    const nextUrl = getRedirectForDisallowedRoute(targetVersion, pathname);
    router.push(nextUrl);
  }

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      {/* Segmented Control Pill */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          background: "var(--surface-muted, rgba(0,0,0,0.06))",
          borderRadius: 20,
          padding: 2,
          border: "1px solid var(--line, rgba(0,0,0,0.12))",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {VERSION_LIST.map((v) => {
          const isActive = v.id === detectedVersion;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => handleSelect(v.id)}
              title={`${v.name}: ${v.tagline}`}
              style={{
                border: "none",
                borderRadius: 16,
                padding: compact ? "4px 8px" : "4px 12px",
                background: isActive ? "var(--usm-azul, #004B85)" : "transparent",
                color: isActive ? "#ffffff" : "var(--ink-500, #555)",
                cursor: "pointer",
                fontFamily: "var(--ff-mono, monospace)",
                fontSize: 11.5,
                fontWeight: isActive ? 700 : 500,
                transition: "all 0.15s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>{v.id}</span>
              {isActive && !compact && (
                <span
                  style={{
                    fontSize: 9.5,
                    opacity: 0.85,
                    fontFamily: "var(--ff-body, sans-serif)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {v.id === "v1" ? "MVP" : v.id === "v2" ? "+Acc" : "Full"}
                </span>
              )}
            </button>
          );
        })}

        {/* Info button */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          title="Ver detalle de versiones"
          style={{
            border: "none",
            background: "transparent",
            color: "var(--ink-500, #666)",
            padding: "4px 6px",
            cursor: "pointer",
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
          }}
          aria-label="Información de versiones"
        >
          <I name="alert" size={13} />
        </button>
      </div>

      {/* Info Popover / Dropdown */}
      {menuOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 320,
            background: "var(--surface, #fff)",
            border: "1px solid var(--line, #e2e8f0)",
            borderRadius: 12,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            padding: 14,
            zIndex: 100,
            color: "var(--ink-900, #111)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
              paddingBottom: 8,
              borderBottom: "1px solid var(--line, #eee)",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Versiones de S.I.G.T.E</div>
              <div style={{ fontSize: 11, color: "var(--ink-500, #666)" }}>
                Navegación incremental por URL
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--ink-500, #666)",
                fontSize: 14,
                fontWeight: "bold",
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {VERSION_LIST.map((v) => {
              const isSelected = v.id === detectedVersion;
              return (
                <div
                  key={v.id}
                  onClick={() => handleSelect(v.id)}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    border: isSelected
                      ? "2px solid var(--usm-azul, #004B85)"
                      : "1px solid var(--line, #eee)",
                    background: isSelected ? "var(--accent-050, #f0f7ff)" : "var(--surface, #fff)",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span
                      style={{
                        fontFamily: "var(--ff-mono, monospace)",
                        fontWeight: 700,
                        fontSize: 12,
                        color: isSelected ? "var(--usm-azul, #004B85)" : "inherit",
                      }}
                    >
                      {v.label}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: 6,
                        background: isSelected ? "var(--usm-azul, #004B85)" : "var(--surface-muted, #eee)",
                        color: isSelected ? "#fff" : "var(--ink-500, #666)",
                      }}
                    >
                      {v.badge}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-500, #666)", marginTop: 4 }}>
                    {v.tagline}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function VersionBadge({ version }: { version: AppVersion }) {
  const info = VERSIONS[version];
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 9px",
        borderRadius: 999,
        background: "var(--accent-050, #f0f7ff)",
        border: "1px solid var(--accent, #004B85)",
        color: "var(--usm-azul, #004B85)",
        fontSize: 11.5,
        fontWeight: 600,
        fontFamily: "var(--ff-mono, monospace)",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--usm-azul, #004B85)",
          display: "inline-block",
        }}
      />
      <span>{info.name}</span>
    </div>
  );
}
