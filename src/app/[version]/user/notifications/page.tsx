"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, Badge } from "@/components/ui-system";
import { I } from "@/components/Icon";
import { formatDate } from "@/lib/utils";
import { AppVersion, parseVersion } from "@/lib/versions";

type N = { id: string; title: string; message: string; read: boolean; createdAt: string };

export default function VersionUserNotifications() {
  const params = useParams<{ version: string }>();
  const version: AppVersion = parseVersion(params?.version, "v3");

  const [items, setItems] = useState<N[]>([]);

  async function load() {
    const r = await fetch("/api/notifications").then((r) => r.json());
    setItems(r.notifications ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function markAllRead() {
    const unread = items.filter((n) => !n.read).map((n) => n.id);
    if (unread.length === 0) return;
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unread }),
    });
    load();
  }

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <header className="row between" style={{ alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 24 }}>Notificaciones</h1>
          <p className="muted">Alertas y actividad de tu cuenta · {version.toUpperCase()}</p>
        </div>
        <button className="btn ghost" onClick={markAllRead} disabled={unreadCount === 0}>
          <I name="check" size={16} />
          Marcar todas como leídas
          {unreadCount > 0 && <Badge kind="info">{unreadCount}</Badge>}
        </button>
      </header>

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((n) => (
          <Card
            key={n.id}
            style={n.read ? { opacity: 0.75 } : { borderColor: "var(--accent)" }}
          >
            <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  display: "grid",
                  placeItems: "center",
                  background: n.read ? "var(--surface-muted, #eee)" : "var(--accent-050)",
                  color: n.read ? "var(--ink-500)" : "var(--usm-azul)",
                  flex: "none",
                }}
              >
                <I name={n.read ? "mail" : "bell"} size={18} />
              </span>
              <div style={{ flex: 1 }}>
                <div className="row between">
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{n.title}</div>
                  <span className="mono muted" style={{ fontSize: 11.5 }}>
                    {formatDate(n.createdAt)}
                  </span>
                </div>
                <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  {n.message}
                </p>
              </div>
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <p className="muted" style={{ padding: 24, textAlign: "center" }}>
            No tienes notificaciones
          </p>
        )}
      </div>
    </div>
  );
}
