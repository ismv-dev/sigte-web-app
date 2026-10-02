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
      <header className="row between" style={{ alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 24 }}>Mis infracciones</h1>
          <p className="muted">
            Registro de multas y faltas registradas por los guardias · {version.toUpperCase()}
          </p>
        </div>
        {openCount > 0 && (
          <Badge kind="no">{openCount} abierta(s)</Badge>
        )}
      </header>

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((inf) => (
          <Card key={inf.id}>
            <div className="row between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <Plate size="sm">{inf.vehicle.plate}</Plate>
                  <Badge kind={STATUS_KIND[inf.status]}>{STATUS_LABEL[inf.status]}</Badge>
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, marginTop: 8 }}>{inf.type}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{inf.description}</div>
              </div>
              <div style={{ textAlign: "right", fontSize: 12 }} className="muted">
                <div>Registrada por {inf.guard.name}</div>
                <div className="mono" style={{ marginTop: 2 }}>{formatDate(inf.createdAt)}</div>
              </div>
            </div>

            {inf.status === "OPEN" && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                <button
                  className="btn ghost sm"
                  onClick={() => acknowledge(inf.id)}
                  disabled={busyId === inf.id}
                >
                  <I name="check" size={14} />
                  {busyId === inf.id ? "Guardando…" : "Reconocer infracción"}
                </button>
              </div>
            )}
          </Card>
        ))}
        {items.length === 0 && (
          <p className="muted" style={{ padding: 24, textAlign: "center" }}>
            No registras infracciones. ¡Excelente!
          </p>
        )}
      </div>
    </div>
  );
}
