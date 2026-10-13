"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { I } from "@/components/Icon";
import { Brand } from "@/components/ui-system";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VersionSwitcher } from "@/components/VersionSwitcher";
import { type AppVersion, isValidVersion } from "@/lib/versions";

export interface PanelNavItem { href: string; label: string; icon: string; }
export interface PanelNavGroup { grp: string; items: PanelNavItem[]; }

function Sidebar({
  groups,
  open,
  version,
  onClose,
}: {
  groups: PanelNavGroup[];
  open: boolean;
  version: AppVersion;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Ítem activo = el href más específico (más largo) que coincide con la ruta
  const activeHref = groups
    .flatMap((g) => g.items)
    .filter((it) => pathname === it.href || pathname.startsWith(it.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace(`/${version}/login`);
  }

  return (
    <aside
      className={"panel-sidebar" + (open ? " open" : "")}
      style={{
        width: 244,
        background: "var(--usm-azul-900)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        flex: "none",
      }}
    >
      <div
        style={{
          padding: "16px 16px 14px",
          borderBottom: "1px solid rgba(255,255,255,.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Link
          href={`/${version}`}
          onClick={onClose}
          style={{
            color: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flex: 1,
            minWidth: 0,
          }}
        >
          <Brand light />
          <span
            style={{
              fontFamily: "var(--ff-mono)",
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.15)",
              color: "var(--usm-amarillo, #FFB81C)",
              flexShrink: 0,
            }}
          >
            {version}
          </span>
        </Link>
        <button
          className="panel-close-btn"
          onClick={onClose}
          aria-label="Cerrar menú lateral"
          style={{
            border: "none",
            background: "transparent",
            color: "rgba(255,255,255,0.8)",
            cursor: "pointer",
            padding: 4,
            borderRadius: 6,
            display: "none",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <I name="x" size={20} />
        </button>
      </div>
      <nav style={{ flex: 1, overflowY: "auto", padding: "14px 12px" }}>
        {groups.map((g) => (
          <div key={g.grp} style={{ marginBottom: 18 }}>
            <div
              style={{
                fontFamily: "var(--ff-display)",
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,.6)",
                padding: "0 10px 7px",
              }}
            >
              {g.grp}
            </div>
            {g.items.map((it) => {
              const on = it.href === activeHref;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={onClose}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "9px 10px",
                    marginBottom: 2,
                    borderRadius: 8,
                    background: on ? "var(--usm-azul)" : "transparent",
                    color: on ? "#fff" : "rgba(255,255,255,.78)",
                    fontFamily: "var(--ff-body)",
                    fontSize: 13.5,
                    fontWeight: on ? 600 : 400,
                    boxShadow: on ? "inset 3px 0 0 var(--usm-amarillo)" : "none",
                  }}
                >
                  <I name={it.icon} size={18} stroke={1.9} />
                  <span style={{ flex: 1 }}>{it.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <button
        onClick={logout}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 22px",
          border: "none",
          borderTop: "1px solid rgba(255,255,255,.1)",
          background: "transparent",
          color: "rgba(255,255,255,.7)",
          cursor: "pointer",
          fontFamily: "var(--ff-body)",
          fontSize: 13,
        }}
      >
        <I name="logout" size={17} /> Cerrar sesión
      </button>
    </aside>
  );
}

function TopBar({
  title,
  subtitle,
  userName,
  userRole,
  version,
  onBurger,
}: {
  title: string;
  subtitle: string;
  userName: string;
  userRole: string;
  version: AppVersion;
  onBurger: () => void;
}) {
  const ini = userName
    .split(/[\s.]/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header
      className="panel-topbar"
      style={{
        height: 62,
        flex: "none",
        background: "var(--surface)",
        borderBottom: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "0 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
        <button className="panel-burger" onClick={onBurger} aria-label="Abrir menú">
          <I name="menu" size={22} />
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: 18, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </div>
          <div className="panel-topbar-sub" style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <VersionSwitcher currentVersion={version} compact />
        <ThemeToggle />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingLeft: 6,
            borderLeft: "1px solid var(--line)",
          }}
        >
          <span className="avatar sm">{ini || "…"}</span>
          <div className="panel-topbar-user" style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{userName}</div>
            <div style={{ fontSize: 11, color: "var(--ink-500)" }}>{userRole}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function PanelShell({
  groups,
  title,
  subtitle,
  userName,
  userRole,
  version,
  children,
}: {
  groups: PanelNavGroup[];
  title: string;
  subtitle: string;
  userName: string;
  userRole: string;
  version?: AppVersion;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  const detectedVersion: AppVersion =
    version ||
    (isValidVersion(pathname.split("/")[1])
      ? (pathname.split("/")[1] as AppVersion)
      : "v3");

  return (
    <div style={{ height: "100vh", display: "flex" }}>
      <Sidebar
        groups={groups}
        open={navOpen}
        version={detectedVersion}
        onClose={() => setNavOpen(false)}
      />
      {navOpen && <div className="panel-overlay" onClick={() => setNavOpen(false)} />}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar
          title={title}
          subtitle={subtitle}
          userName={userName}
          userRole={userRole}
          version={detectedVersion}
          onBurger={() => setNavOpen(true)}
        />
        <main style={{ flex: 1, overflowY: "auto", background: "var(--bg)" }}>{children}</main>
      </div>
    </div>
  );
}
