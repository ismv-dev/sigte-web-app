"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, Plate } from "@/components/ui-system";
import { I } from "@/components/Icon";
import { AppVersion, parseVersion } from "@/lib/versions";

type Vehicle = { id: string; plate: string };
type QRData = { token: string; dataUrl: string; vehicle: Vehicle; expiresAt: number };

const TTL_MS = 5 * 60_000;

export default function VersionUserQR() {
  const params = useParams<{ version: string }>();
  const version: AppVersion = parseVersion(params?.version, "v3");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [qr, setQr] = useState<QRData | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/vehicles")
      .then((r) => r.json())
      .then((d) => {
        setVehicles(d.vehicles ?? []);
        if (d.vehicles?.[0]) setSelected(d.vehicles[0].id);
      });
  }, []);

  useEffect(() => {
    if (!qr) return;
    const t = setInterval(() => {
      const left = Math.max(0, Math.round((qr.expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) setQr(null);
    }, 500);
    return () => clearInterval(t);
  }, [qr]);

  async function generate() {
    if (!selected) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/qr?vehicleId=${selected}`).then((r) => r.json());
      setQr(r);
    } finally {
      setLoading(false);
    }
  }

  const pct = qr ? Math.round((secondsLeft / (TTL_MS / 1000)) * 100) : 0;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 24 }}>Mi código QR de acceso</h1>
        <p className="muted" style={{ fontSize: 13 }}>
          Genera un QR único por vehículo. Válido 5 minutos · {version.toUpperCase()}
        </p>
      </div>

      <Card>
        <div style={{ maxWidth: 360, margin: "0 auto", textAlign: "center" }}>
          <div className="field" style={{ textAlign: "left", marginBottom: 14 }}>
            <label className="field-lbl" htmlFor="veh">Vehículo</label>
            <select
              id="veh"
              className="select"
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setQr(null);
              }}
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn primary lg block"
            onClick={generate}
            disabled={loading || !selected}
          >
            <I name="qr" size={18} />
            {loading ? "Generando…" : "Generar nuevo código"}
          </button>

          {qr && (
            <div style={{ marginTop: 20, display: "grid", gap: 14, justifyItems: "center" }}>
              <div
                style={{
                  background: "#fff",
                  padding: 14,
                  borderRadius: 12,
                  boxShadow: "0 2px 8px rgba(0,0,0,.08)",
                  display: "inline-block",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qr.dataUrl}
                  alt={`QR ${qr.vehicle.plate}`}
                  width={220}
                  height={220}
                  style={{ display: "block" }}
                />
              </div>

              <Plate size="lg">{qr.vehicle.plate}</Plate>

              <div style={{ width: "100%", maxWidth: 260 }}>
                <div className="row between" style={{ fontSize: 12, marginBottom: 4 }}>
                  <span className="muted">Expira en</span>
                  <span className="mono bold" style={{ color: secondsLeft < 30 ? "var(--no)" : "inherit" }}>
                    {Math.floor(secondsLeft / 60)}:
                    {(secondsLeft % 60).toString().padStart(2, "0")}
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: "var(--line)",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: secondsLeft < 30 ? "var(--no)" : "var(--usm-azul)",
                      transition: "width .5s linear",
                    }}
                  />
                </div>
              </div>

              <button
                className="btn ghost sm"
                onClick={() => {
                  navigator.clipboard.writeText(qr.token);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                <I name={copied ? "check" : "qr"} size={14} />
                {copied ? "Copiado" : "Copiar código de texto"}
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
