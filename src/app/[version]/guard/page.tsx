"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Card, Plate, Badge, Metric } from "@/components/ui-system";
import { I } from "@/components/Icon";
import { QrScanner } from "@/components/QrScanner";
import { AppVersion, isFeatureEnabled, parseVersion } from "@/lib/versions";
import { maskPlate, maskName } from "@/lib/masking";

type Vehicle = {
  id: string;
  plate: string;
  plateMasked?: string;
  make: string | null;
  model: string | null;
  color: string | null;
  authorized: boolean;
  owner: { id: string; name: string; nameMasked?: string; email?: string; universityId?: string | null };
  currentBlock: { id: string; name: string } | null;
};

type Block = {
  id: string;
  name: string;
  capacity: number;
  occupied: number;
  free: number;
  isDefault: boolean;
};

type Totals = { inside: number; capacity: number; free: number; defaultBlockId: string | null };
type LookupResponse = { vehicle: Vehicle | null; openInfractions?: number; qrError?: "invalido" | "expirado" };

export default function VersionGuardAccess() {
  const params = useParams<{ version: string }>();
  const version: AppVersion = parseVersion(params?.version, "v3");

  const [mode, setMode] = useState<"plate" | "qr" | "uid">("plate");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<LookupResponse | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);

  const hasAccessRecords = isFeatureEnabled(version, "access_records");
  const hasParking = isFeatureEnabled(version, "parking_monitoring");

  useEffect(() => {
    if (hasParking) {
      refreshParking();
    }
  }, [hasParking]);

  async function refreshParking() {
    const r = await fetch("/api/parking").then((r) => r.json());
    setBlocks(r.blocks ?? []);
    setTotals(r.totals ?? null);
  }

  async function lookup(value?: string) {
    const v = (value ?? query).trim();
    if (!v) return;
    const r = await fetch(
      `/api/access/lookup?${mode}=${encodeURIComponent(v)}`
    ).then((r) => r.json());
    setResult(r);
    if (r.qrError === "expirado") toast.error("QR expirado (válido por 5 minutos)");
    else if (r.qrError === "invalido") toast.error("QR inválido o falsificado");
    else if (!r.vehicle) toast.error("Vehículo no encontrado en el sistema");
    else if (version === "v1") toast.success("Vehículo identificado y verificado");
  }

  function handleScan(text: string) {
    setScanning(false);
    setQuery(text);
    lookup(text);
  }

  async function register(direction: "IN" | "OUT") {
    if (!hasAccessRecords) {
      toast.error("El registro de accesos no está disponible en esta versión.");
      return;
    }
    if (!result?.vehicle) return;
    setBusy(true);
    try {
      const r = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: result.vehicle.id,
          method: mode === "plate" ? "PLATE" : mode === "qr" ? "QR" : "CARD",
          direction,
          blockId: direction === "IN" && hasParking ? selectedBlock || undefined : undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        toast.error(data.error ?? "Error al registrar");
      } else {
        if (data.warning) toast.warning(data.warning);
        toast.success(direction === "IN" ? "Ingreso registrado" : "Salida registrada");
        setQuery("");
        setResult(null);
        if (hasParking) refreshParking();
      }
    } finally {
      setBusy(false);
    }
  }

  const defaultBlock = blocks.find((b) => b.isDefault);
  const pctGlobal = totals && totals.capacity > 0
    ? Math.round((totals.inside / totals.capacity) * 100)
    : 0;

  const MODES: { id: typeof mode; label: string; icon: string }[] = [
    { id: "plate", label: "Patente", icon: "camera" },
    { id: "qr", label: "QR", icon: "qr" },
    { id: "uid", label: "U-Card", icon: "idcard" },
  ];

  return (
    <div className="page-padding" style={{ padding: 24 }}>
      <div className="row between" style={{ marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 24 }}>
            {!hasAccessRecords
              ? "Validar QR y Vehículos"
              : hasParking
              ? "Control de acceso y estacionamiento"
              : "Control de acceso vehicular"}
          </h1>
          <p className="muted" style={{ fontSize: 13 }}>
            {!hasAccessRecords
              ? "Punto de control — validación rápida de credenciales y patentes."
              : hasParking
              ? "Punto de control perimetral con asignación de bloques y aforo en tiempo real."
              : "Punto de control — registro de entradas y salidas al recinto."}
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {isFeatureEnabled(version, "access_records") && (
            <Link href={`/${version}/guard/history`} className="btn ghost sm">
              <I name="history" size={14} /> Bitácora
            </Link>
          )}
          {isFeatureEnabled(version, "infractions") && (
            <Link href={`/${version}/guard/infractions`} className="btn ghost sm">
              <I name="alert" size={14} /> Infracciones
            </Link>
          )}
        </div>
      </div>

      {/* Aforo en vivo (v3) */}
      {hasParking && totals && (
        <div className="grid-3" style={{ marginBottom: 20 }}>
          <Metric
            label="Ocupación global"
            value={`${totals.inside}/${totals.capacity}`}
            sub={`${pctGlobal}% del aforo`}
            delta={
              pctGlobal >= 90
                ? { dir: "up", text: "Crítico" }
                : pctGlobal >= 75
                ? { dir: "up", text: "Alto" }
                : { dir: "down", text: "Normal" }
            }
          />
          <Metric
            label="Cupos libres"
            value={totals.free}
            sub={`En ${blocks.length} bloques`}
          />
          <Metric
            label="Bloque por defecto"
            value={defaultBlock?.name ?? "—"}
            sub={defaultBlock ? `${defaultBlock.free} libres` : "Sin bloque default"}
          />
        </div>
      )}

      {/* Tarjeta de validación */}
      <Card pad="sm" style={{ maxWidth: 640 }}>
        <div className="row between" style={{ marginBottom: 14, alignItems: "center" }}>
          <div className="row" style={{ gap: 4 }}>
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`btn sm ${mode === m.id ? "primary" : "ghost"}`}
                onClick={() => {
                  setMode(m.id);
                  setResult(null);
                  setQuery("");
                }}
              >
                <I name={m.icon} size={14} />
                {m.label}
              </button>
            ))}
          </div>
          {mode === "qr" && (
            <button
              type="button"
              className="btn sm ghost"
              onClick={() => setScanning((s) => !s)}
            >
              <I name="camera" size={14} />
              {scanning ? "Cerrar cámara" : "Escanear con cámara"}
            </button>
          )}
        </div>

        {scanning && mode === "qr" && (
          <div style={{ marginBottom: 16 }}>
            <QrScanner onScan={handleScan} onClose={() => setScanning(false)} />
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookup();
          }}
          className="row"
          style={{ gap: 8 }}
        >
          <div className="field" style={{ flex: 1, margin: 0 }}>
            <input
              className="input mono"
              placeholder={
                mode === "plate"
                  ? "Ej: BBCL12 o CF-1234"
                  : mode === "qr"
                  ? "Pega el código QR o escanea"
                  : "Ej: 2020123456"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" className="btn primary">
            <I name="search" size={15} />
            Buscar
          </button>
        </form>

        {result && !result.vehicle && !result.qrError && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 14px",
              background: "var(--surface-2, #FBFCFD)",
              borderRadius: 8,
              fontSize: 13,
              color: "var(--ink-500)",
            }}
          >
            No se encontró un vehículo con el criterio indicado.
          </div>
        )}

        {result?.vehicle && (
          <VehicleCard
            vehicle={result.vehicle}
            openInfractions={result.openInfractions ?? 0}
            blocks={blocks}
            defaultBlock={defaultBlock}
            selectedBlock={selectedBlock}
            onBlockChange={setSelectedBlock}
            busy={busy}
            hasAccessRecords={hasAccessRecords}
            hasParking={hasParking}
            onIn={() => register("IN")}
            onOut={() => register("OUT")}
          />
        )}
      </Card>
    </div>
  );
}

function VehicleCard({
  vehicle,
  openInfractions,
  blocks,
  defaultBlock,
  selectedBlock,
  onBlockChange,
  busy,
  hasAccessRecords,
  hasParking,
  onIn,
  onOut,
}: {
  vehicle: Vehicle;
  openInfractions: number;
  blocks: Block[];
  defaultBlock?: Block;
  selectedBlock: string;
  onBlockChange: (id: string) => void;
  busy: boolean;
  hasAccessRecords: boolean;
  hasParking: boolean;
  onIn: () => void;
  onOut: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && !busy && hasAccessRecords) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === "input" || tag === "select" || tag === "textarea") return;
        if (vehicle.authorized && !vehicle.currentBlock) {
          e.preventDefault();
          onIn();
        } else if (vehicle.currentBlock) {
          e.preventDefault();
          onOut();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [vehicle, busy, hasAccessRecords, onIn, onOut]);
  return (
    <Card pad="sm" style={{ marginTop: 16 }}>
      <div className="row between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <Plate size="lg">{vehicle.plateMasked || maskPlate(vehicle.plate)}</Plate>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            {[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—"}
            {vehicle.color ? ` · ${vehicle.color}` : ""}
          </p>
          {/* Principio de Minimización RT-03 / RQ-03: Solo se expone la patente y nombre enmascarados */}
          <p style={{ fontSize: 13, marginTop: 8 }}>
            <span className="muted">Dueño: </span>
            <span style={{ fontWeight: 600 }}>{vehicle.owner.nameMasked || maskName(vehicle.owner.name)}</span>
          </p>
        </div>
        <div className="row" style={{ gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Badge kind={vehicle.authorized ? "go" : "no"}>
            {vehicle.authorized ? "AUTORIZADO" : "BLOQUEADO"}
          </Badge>
          {hasParking && vehicle.currentBlock && (
            <Badge kind="info">{vehicle.currentBlock.name}</Badge>
          )}
          {openInfractions > 0 && (
            <Badge kind="wait">{openInfractions} infracción(es)</Badge>
          )}
        </div>
      </div>

      {/* Block assignment only in v3 */}
      {hasParking && !vehicle.currentBlock && (
        <div className="field" style={{ marginTop: 14 }}>
          <div className="row between" style={{ alignItems: "center" }}>
            <label className="field-lbl" htmlFor="bloque-asignar">Bloque a asignar (opcional)</label>
            {defaultBlock && (
              <Badge kind="info">Default: {defaultBlock.name}</Badge>
            )}
          </div>
          <select
            id="bloque-asignar"
            className="select"
            value={selectedBlock}
            onChange={(e) => onBlockChange(e.target.value)}
          >
            <option value="">Usar default ({defaultBlock?.name ?? "No definido"})</option>
            {blocks.map((b) => (
              <option key={b.id} value={b.id} disabled={b.free <= 0}>
                {b.isDefault ? "⭐ " : ""}
                {b.name} · {b.free}/{b.capacity} libres
              </option>
            ))}
          </select>
          <span className="field-hint">
            Si no eliges un bloque, el vehículo queda en{" "}
            {defaultBlock?.name ?? "el bloque default"}.
          </span>
        </div>
      )}

      {/* Action buttons: Available in v2 and v3 (when access_records is enabled) */}
      {hasAccessRecords ? (
        <div className="row wrap" style={{ gap: 8, marginTop: 14 }}>
          <button
            className="btn primary lg"
            style={{ flex: 1 }}
            onClick={onIn}
            disabled={busy || !vehicle.authorized || !!vehicle.currentBlock}
            title="Presiona Enter o haz click para autorizar ingreso"
          >
            <I name="login" size={18} />
            Registrar ingreso {!vehicle.currentBlock && vehicle.authorized ? "(Enter ↵)" : ""}
          </button>
          <button
            className="btn lg"
            style={{ flex: 1 }}
            onClick={onOut}
            disabled={busy || !vehicle.currentBlock}
            title="Presiona Enter o haz click para registrar salida"
          >
            <I name="logout" size={18} />
            Registrar salida {vehicle.currentBlock ? "(Enter ↵)" : ""}
          </button>
        </div>
      ) : (
        <div
          style={{
            marginTop: 14,
            padding: "10px 12px",
            background: "var(--surface-2, #FBFCFD)",
            borderRadius: 8,
            fontSize: 12.5,
            color: "var(--ink-500)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <I name="check" size={15} />
          <span>
            Lectura completada. En <b>Versión 1</b> la bitácora de ingresos/salidas no está activa.
          </span>
        </div>
      )}
    </Card>
  );
}
