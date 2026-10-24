/**
 * Módulo de Resiliencia y Disponibilidad Perimetral (RQ-08).
 *
 * En caso de degradación de la red perimetral, falla óptica de la cámara o
 * indisponibilidad del servicio LPR, el sistema conmuta de forma transparente
 * hacia métodos secundarios (Escaneo QR o validación por credencial) en un tiempo <= 5 s,
 * garantizando una disponibilidad operativa del flujo de validación >= 95%.
 */

export interface LprHealthStatus {
  online: boolean;
  latencyMs: number;
  lastHeartbeat: string;
  recommendedMode: "LPR" | "QR_FALLBACK";
}

let lastLprCheckTime = 0;
let lastLprStatus: LprHealthStatus = {
  online: true,
  latencyMs: 15,
  lastHeartbeat: new Date().toISOString(),
  recommendedMode: "LPR",
};

/**
 * Registra un latido o petición exitosa del nodo LPR.
 */
export function recordLprHeartbeat(latencyMs: number) {
  lastLprCheckTime = Date.now();
  lastLprStatus = {
    online: true,
    latencyMs,
    lastHeartbeat: new Date().toISOString(),
    recommendedMode: "LPR",
  };
}

/**
 * Evalúa el estado del nodo LPR y determina si se debe conmutar automáticamente
 * al modo de contingencia (QR / Cédula) conforme a RQ-08 (conmutación en <= 5 s).
 */
export function evaluateLprFallback(timeoutMs: number = 5000): LprHealthStatus {
  const now = Date.now();
  const elapsed = now - lastLprCheckTime;

  // Si no ha habido comunicación en más de timeoutMs (5 segundos), conmutar a contingencia
  if (lastLprCheckTime > 0 && elapsed > timeoutMs) {
    return {
      online: false,
      latencyMs: elapsed,
      lastHeartbeat: lastLprStatus.lastHeartbeat,
      recommendedMode: "QR_FALLBACK",
    };
  }

  return lastLprStatus;
}
