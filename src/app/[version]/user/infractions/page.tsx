"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, Plate, Badge } from "@/components/ui-system";
import { I } from "@/components/Icon";
import { formatDate } from "@/lib/utils";
import { AppVersion, parseVersion } from "@/lib/versions";

type Infraction = {
  id: string;
  type: string;
  description: string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  vehicle: { plate: string };
  guard: { name: string };
};

const TYPES = [
  { k: "WRONG_BLOCK", l: "Estacionado en bloque equivocado" },
  { k: "UNAUTHORIZED_ENTRY", l: "Ingreso no autorizado" },
  { k: "DOUBLE_PARKING", l: "Doble fila" },
  { k: "EXPIRED_PERMIT", l: "Permiso expirado" },
  { k: "BLOCKING_ACCESS", l: "Bloqueando accesos" },
  { k: "SPEEDING", l: "Exceso de velocidad" },
  { k: "OTHER", l: "Otra" },
];

const STATUS_KIND: Record<Infraction["status"], "go" | "no" | "wait" | "neutral"> = {
  OPEN: "no",
  ACKNOWLEDGED: "wait",
  RESOLVED: "go",
  DISMISSED: "neutral",
};

const STATUS_LABEL: Record<Infraction["status"], string> = {
  OPEN: "Abierta",
  ACKNOWLEDGED: "Notificada",
  RESOLVED: "Resuelta",
  DISMISSED: "Descartada",
};

export default function VersionUserInfractions() {
  const params = useParams<{ version: string }>();
  const version: AppVersion = parseVersion(params?.version, "v3");

  const [items, setItems] = useState<Infraction[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/infractions")
      .then((r) => r.json())
      .then((d) => setItems(d.infractions ?? []));
  }, []);

  async function acknowledge(id: string) {
    setBusyId(id);
    try {
      const r = await fetch(`/api/infractions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACKNOWLEDGED" }),
      });
      if (r.ok) {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status: "ACKNOWLEDGED" } : i))
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  const openCount = items.filter((i) => i.status === "OPEN").length;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <header>
        <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 24 }}>Mis infracciones</h1>
        <p className="muted" style={{ fontSize: 13 }}>
          Historial de fiscalización interna · {version.toUpperCase()}
        </p>
      </header>

      {openCount > 0 && (
        <div className="callout warn row" style={{ gap: 10 }}>
          <I name="shieldAlert" size={18} />
          <span>
            Tienes {openCount} {openCount === 1 ? "infracción abierta" : "infracciones abiertas"} que requieren tu atención.
          </span>
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((i) => (
          <Card key={i.id}>
            <div className="row between" style={{ alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div className="row" style={{ alignItems: "flex-start", gap: 12, flex: 1, minWidth: 240 }}>
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    display: "grid",
                    placeItems: "center",
                    background: "var(--accent-050)",
                    color: "var(--accent-700)",
                    flexShrink: 0,
                  }}
                >
                  <I name="shieldAlert" size={20} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <Plate size="sm">{i.vehicle.plate}</Plate>
                    <span className="muted">·</span>
                    <strong>{TYPES.find((t) => t.k === i.type)?.l ?? i.type}</strong>
                  </div>
                  <p style={{ marginTop: 6, wordBreak: "break-word" }}>{i.description}</p>
                  <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                    Registrada por <span style={{ color: "var(--ink-900)" }}>{i.guard.name}</span>
                    {" · "}
                    <span className="mono">{formatDate(i.createdAt)}</span>
                  </p>
                </div>
              </div>
              <Badge kind={STATUS_KIND[i.status]}>{STATUS_LABEL[i.status]}</Badge>
            </div>
            {i.status === "OPEN" && (
              <div style={{ marginTop: 12 }}>
                <button
                  className="btn primary sm"
                  onClick={() => acknowledge(i.id)}
                  disabled={busyId === i.id}
                >
                  <I name="check" size={15} />
                  {busyId === i.id ? "Guardando…" : "Reconocer"}
                </button>
              </div>
            )}
          </Card>
        ))}
        {items.length === 0 && (
          <Card>
            <div className="col center" style={{ padding: "48px 0", gap: 6, textAlign: "center" }}>
              <I name="shieldCheck" size={40} style={{ color: "var(--ok-600)" }} />
              <p style={{ fontWeight: 600 }}>Sin infracciones</p>
              <p className="muted">¡Bien hecho! Tu historial está limpio.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
