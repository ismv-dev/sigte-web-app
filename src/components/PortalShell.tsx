"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode } from "react";
import { I } from "@/components/Icon";
import { Brand } from "@/components/ui-system";
import { ThemeToggle } from "@/components/ThemeToggle";

export interface PortalTab { href: string; label: string; icon: string; }

export function PortalShell({ tabs, userName, children }: { tabs: PortalTab[]; userName: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const ini = userName.split(/[\s.]/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }
  // Pestaña activa = la coincidencia más específica (evita que "Inicio" /user
  // quede marcada en todas las subrutas del portal).
  const activeHref = tabs
    .filter((t) => pathname === t.href || pathname.startsWith(t.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/user" style={{ color: "var(--usm-azul)" }}><Brand /></Link>
          <div style={{ flex: 1 }} />
          <ThemeToggle />
          <span className="avatar">{ini || "…"}</span>
          <button className="btn ghost icon" onClick={logout} title="Cerrar sesión"><I name="logout" size={18} /></button>
        </div>
        <nav style={{ maxWidth: 920, margin: "0 auto", padding: "0 24px", display: "flex", gap: 4, overflowX: "auto" }}>
          {tabs.map((t) => {
            const on = t.href === activeHref;
            return (
              <Link key={t.href} href={t.href} style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 12px", fontSize: 13.5, fontWeight: on ? 600 : 500, color: on ? "var(--usm-azul)" : "var(--ink-500)", borderBottom: on ? "2px solid var(--usm-azul)" : "2px solid transparent" }}>
                <I name={t.icon} size={17} /> {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main style={{ maxWidth: 920, margin: "0 auto", padding: 24 }}>{children}</main>
    </div>
  );
}
