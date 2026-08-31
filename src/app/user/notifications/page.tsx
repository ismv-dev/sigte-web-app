"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/ui-system";
import { I } from "@/components/Icon";
import { formatDate } from "@/lib/utils";

type N = { id: string; title: string; message: string; read: boolean; createdAt: string };

export default function UserNotifications() {
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
          <p className="muted">Alertas y actividad de tu cuenta</p>
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
                  flexShrink: 0,
                  background: n.read ? "var(--line-soft)" : "var(--accent-050)",
                  color: n.read ? "var(--ink-500)" : "var(--accent-700)",
                }}
              >
                <I name="bell" size={16} />
              </span>
              <div style={{ flex: 1 }}>
                <div className="row between" style={{ alignItems: "flex-start", gap: 12 }}>
                  <strong>{n.title}</strong>
                  {!n.read && (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--accent)",
                        flexShrink: 0,
                        marginTop: 6,
                      }}
                    />
                  )}
                </div>
                <p style={{ marginTop: 4 }}>{n.message}</p>
                <p className="muted mono" style={{ fontSize: 12, marginTop: 8 }}>
                  {formatDate(n.createdAt)}
                </p>
              </div>
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <Card>
            <div className="col center" style={{ padding: "48px 0", gap: 6, textAlign: "center" }}>
              <I name="bell" size={40} style={{ color: "var(--accent-700)" }} />
              <p style={{ fontWeight: 600 }}>Sin notificaciones</p>
              <p className="muted">Te avisaremos cuando haya novedades.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
