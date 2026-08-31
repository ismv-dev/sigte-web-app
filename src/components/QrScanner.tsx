"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { I } from "@/components/Icon";

/**
 * Escáner de QR por cámara usando @zxing/browser (decodificación en JS).
 * Funciona en todos los navegadores de escritorio y móvil, sin depender de la
 * API nativa `BarcodeDetector` (que no existe en Chrome/Edge para Windows).
 *
 * Requisito: contexto seguro (HTTPS o http://localhost). Por LAN
 * (http://192.168.x.x) el navegador bloquea la cámara.
 */
export function QrScanner({ onScan, onClose }: { onScan: (text: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let controls: IScannerControls | null = null;
    let done = false;
    const reader = new BrowserQRCodeReader();

    async function start() {
      if (typeof window === "undefined") return;
      if (!window.isSecureContext) {
        setError("La cámara solo funciona en HTTPS o en http://localhost. Si entraste por la red local (http://192.168…), ábrelo desde la URL de Vercel o usa localhost en este equipo.");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Este navegador no permite el acceso a la cámara.");
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      try {
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          video,
          (result) => {
            if (result && !done) {
              done = true;
              onScanRef.current(result.getText());
              controls?.stop();
            }
          }
        );
        if (done) controls.stop();
      } catch (e) {
        const name = (e as { name?: string })?.name;
        setError(
          name === "NotAllowedError"
            ? "Permiso de cámara denegado. Habilítalo en el navegador y reintenta."
            : "No se pudo abrir la cámara."
        );
      }
    }

    start();
    return () => {
      done = true;
      controls?.stop();
    };
  }, []);

  return (
    <div style={{ marginTop: 14, border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", background: "#000" }}>
      <div className="row between" style={{ alignItems: "center", padding: "8px 12px", background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
        <span className="row" style={{ gap: 6, alignItems: "center", fontSize: 13, fontWeight: 600 }}>
          <I name="qr" size={16} /> Escaneando QR…
        </span>
        <button type="button" className="btn ghost icon" onClick={onClose} aria-label="Cerrar cámara">
          <I name="x" size={16} />
        </button>
      </div>
      {error ? (
        <div style={{ padding: 20, color: "#fff", fontSize: 13, lineHeight: 1.5 }}>{error}</div>
      ) : (
        <div style={{ position: "relative", aspectRatio: "4 / 3", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", width: "55%", aspectRatio: "1", border: "3px solid rgba(255,255,255,.85)", borderRadius: 14, boxShadow: "0 0 0 9999px rgba(0,0,0,.35)" }} />
        </div>
      )}
    </div>
  );
}
