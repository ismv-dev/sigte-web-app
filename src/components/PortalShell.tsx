"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { I } from "@/components/Icon";
import { Brand } from "@/components/ui-system";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VersionSwitcher } from "@/components/VersionSwitcher";
import { type AppVersion, isValidVersion } from "@/lib/versions";

export interface PortalTab { href: string; label: string; icon: string; }

export function PortalShell({
  tabs,
  userName,
  version,
  children,
}: {
  tabs: PortalTab[];
  userName: string;
  version?: AppVersion;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const detectedVersion: AppVersion =
    version ||
    (isValidVersion(pathname.split("/")[1])
      ? (pathname.split("/")[1] as AppVersion)
      : "v3");

  const homeHref = `/${detectedVersion}/user`;

  const ini = userName
    .split(/[\s.]/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace(`/${detectedVersion}/login`);
  }

  // Pestaña activa = la coincidencia más específica
  const activeHref = tabs
    .filter((t) => pathname === t.href || pathname.startsWith(t.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          className="portal-topbar"
          style={{
            maxWidth: 920,
            margin: "0 auto",
            padding: "0 16px",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <Link href={homeHref} style={{ color: "var(--usm-azul)", flexShrink: 0 }}>
            <Brand />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <VersionSwitcher currentVersion={detectedVersion} compact />
            <ThemeToggle />
            <span className="avatar sm" title={userName}>{ini || "…"}</span>
            <button className="btn ghost icon portal-desktop-logout" onClick={logout} title="Cerrar sesión">
              <I name="logout" size={18} />
            </button>
            <button
              className="portal-burger"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--ink-700)",
                cursor: "pointer",
                padding: 6,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <I name={menuOpen ? "x" : "menu"} size={22} />
            </button>
          </div>
        </div>

        {/* Desktop Tabs Navbar */}
        <nav
          className="portal-desktop-nav"
          style={{
            maxWidth: 920,
            margin: "0 auto",
            padding: "0 16px",
            display: "flex",
            gap: 4,
            overflowX: "auto",
          }}
        >
          {tabs.map((t) => {
            const on = t.href === activeHref;
            return (
              <Link
                key={t.href}
                href={t.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "11px 12px",
                  fontSize: 13.5,
                  fontWeight: on ? 600 : 500,
                  color: on ? "var(--usm-azul)" : "var(--ink-500)",
                  borderBottom: on ? "2px solid var(--usm-azul)" : "2px solid transparent",
                  whiteSpace: "nowrap",
                }}
              >
                <I name={t.icon} size={17} /> {t.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile Collapsible Navigation Menu */}
        {menuOpen && (
          <div
            className="portal-mobile-menu"
            style={{
              background: "var(--surface)",
              borderTop: "1px solid var(--line)",
              padding: "12px 16px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              boxShadow: "var(--sh-2)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px 12px",
                borderBottom: "1px solid var(--line)",
                marginBottom: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="avatar">{ini || "…"}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{userName}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-500)" }}>Portal Usuario · {detectedVersion.toUpperCase()}</div>
                </div>
              </div>
              <button
                className="btn ghost sm"
                onClick={logout}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}
              >
                <I name="logout" size={15} /> Salir
              </button>
            </div>
            {tabs.map((t) => {
              const on = t.href === activeHref;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: on ? 600 : 500,
                    color: on ? "#fff" : "var(--ink-700)",
                    background: on ? "var(--usm-azul)" : "transparent",
                    transition: "background 0.15s ease",
                  }}
                >
                  <I name={t.icon} size={18} stroke={on ? 2.2 : 1.8} />
                  <span>{t.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>
      <main className="page-padding" style={{ maxWidth: 920, width: "100%", margin: "0 auto", padding: 24, flex: 1 }}>{children}</main>
    </div>
  );
}
