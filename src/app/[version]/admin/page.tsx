"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Metric, Card, LotGrid } from "@/components/ui-system";
import { ChartsUSM } from "@/components/ChartsUSM";
import { I } from "@/components/Icon";
import { lotLevel, type Lot } from "@/lib/design-data";
import { AppVersion, isFeatureEnabled, parseVersion } from "@/lib/versions";

type Dashboard = {
  metrics: {
    totalUsers: number;
    totalGuards: number;
    totalAdmins: number;
    totalVehicles: number;
    authorizedVehicles: number;
    totalBlocks: number;
    totalAccessLogs: number;
    accessToday: number;
    currentInside: number;
    openInfractions: number;
    infractionsLast7: number;
    avgDailyAccess: number;
    authRate: number;
    peakHour: string | null;
  };
  series: { date: string; in: number; out: number }[];
  occupancy: { id: string; name: string; capacity: number; occupied: number; percentage: number }[];
  topVehicles: { plate: string; owner: string; count: number }[];
  methodDist: Record<string, number>;
};

export default function VersionAdminDashboard() {
  const params = useParams<{ version: string }>();
  const version: AppVersion = parseVersion(params?.version, "v3");

  const [data, setData] = useState<Dashboard | null>(null);

  const hasAccessRecords = isFeatureEnabled(version, "access_records");
  const hasParking = isFeatureEnabled(version, "parking_monitoring");

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setData);
    const interval = setInterval(() => {
      fetch("/api/dashboard").then((r) => r.json()).then(setData);
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <div style={{ padding: 24, display: "grid", gap: 16 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />
        ))}
      </div>
    );
  }

  const m = data.metrics;

  const lots: Lot[] = data.occupancy.map((b) => ({
    id: b.id,
    nombre: b.name,
    ocup: b.occupied,
    cap: b.capacity,
    ...lotLevel(b.occupied, b.capacity),
  }));

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 24 }}>Panel de Administración</h1>
        <p className="muted" style={{ fontSize: 13 }}>
          Vista de mando general · {version.toUpperCase()}
        </p>
      </div>

      {/* Scope banner for v1 or v2 */}
      {version === "v1" && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: 16,
            borderRadius: 8,
            background: "var(--accent-050)",
            border: "1px solid var(--usm-azul-100)",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <I name="qr" size={18} />
          <div>
            <b>Versión 1:</b> Muestra métricas de Usuarios, Vehículos e Infracciones. El registro de accesos
            se incluye en la <b>Versión 2</b> y el monitoreo de estacionamiento en la <b>Versión 3</b>.
          </div>
        </div>
      )}

      {version === "v2" && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: 16,
            borderRadius: 8,
            background: "var(--accent-050)",
            border: "1px solid var(--usm-azul-100)",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <I name="barrier" size={18} />
          <div>
            <b>Versión 2:</b> Incluye registro de accesos y bitácora histórica. El monitoreo y gestión de bloques
            de estacionamiento se incluye en la <b>Versión 3</b>.
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 20 }}>
        <Metric
          label="Usuarios"
          icon="users"
          value={m.totalUsers.toLocaleString("es-CL")}
          sub={`+${m.totalGuards} guardias`}
        />
        <Metric
          label="Vehículos"
          icon="car"
          value={m.totalVehicles.toLocaleString("es-CL")}
          sub={`${m.authorizedVehicles} autorizados`}
        />
        <Metric
          label="Infracciones abiertas"
          icon="shieldAlert"
          value={m.openInfractions.toLocaleString("es-CL")}
          sub="por resolver"
        />

        {/* Access metrics: visible in v2 and v3 */}
        {hasAccessRecords && (
          <>
            <Metric
              label="Accesos hoy"
              icon="history"
              value={m.accessToday.toLocaleString("es-CL")}
              sub={`${m.totalAccessLogs} totales`}
            />
            <Metric
              label="Tasa autorización"
              icon="shieldCheck"
              value={m.authRate + "%"}
              sub="accesos válidos"
            />
          </>
        )}

        {/* Parking metric: visible in v3 only */}
        {hasParking && (
          <Metric
            label="Dentro ahora"
            icon="parking"
            value={m.currentInside.toLocaleString("es-CL")}
            sub={`${m.totalBlocks} bloques`}
          />
        )}
      </div>

      {/* Parking lot grid: visible in v3 only */}
      {hasParking && (
        <Card title="Ocupación ahora">
          <LotGrid cols={3} lots={lots} />
        </Card>
      )}

      {/* Charts: visible in v2 (access charts) and v3 (all charts) */}
      {hasAccessRecords && (
        <ChartsUSM
          series={data.series}
          occupancy={hasParking ? data.occupancy : []}
          methodDist={data.methodDist}
          topVehicles={data.topVehicles}
        />
      )}
    </div>
  );
}
