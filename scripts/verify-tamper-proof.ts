/**
 * Script de Verificación Forense y Simulación de Manipulación Interna (Tampering Simulation)
 *
 * Requerimientos Validados:
 *   - RT-06: Estructura de bitácora encadenada mediante HMAC-SHA256 con llave secreta externa (K_audit).
 *   - RQ-04: 100% de detección determinista de manipulación mediante rotura de la cadena de integridad.
 */

import {
  GENESIS_HASH,
  canonicalStringify,
  computeChainHash,
  verifyAuditChainRecords,
} from "../src/lib/audit-chain";

function runTamperProofSimulation() {
  console.log("===============================================================================");
  console.log(" S.I.G.T.E. - Protocolo de Validación Forense Anti-Tampering (RT-06 / RQ-04)");
  console.log("===============================================================================");
  console.log(`[1] Bloque Génesis Institucional (H_0): ${GENESIS_HASH.slice(0, 24)}...`);

  // 1. Construir una cadena legítima de 5 eventos consecutivos
  const legitimateRecords = [];
  let prevHash = GENESIS_HASH;

  const sampleEvents = [
    { action: "ACCESS_GRANTED_LPR", payload: { gate: "NORTE", plateMasked: "BB**12" }, actor: "system_lpr" },
    { action: "ACCESS_GRANTED_QR", payload: { jti: "nonce-uuid-1", user: "u1" }, actor: "guard_1" },
    { action: "INFRACTION_ISSUED", payload: { ticketId: "inf-101", amount: 50000, reason: "SPEEDING" }, actor: "guard_1" },
    { action: "ACCESS_EXIT_PLATE", payload: { gate: "SUR", durationMin: 120 }, actor: "system_lpr" },
    { action: "AUDIT_CHECKPOINT", payload: { status: "HEALTHY" }, actor: "admin_sec" },
  ];

  for (let i = 0; i < sampleEvents.length; i++) {
    const seq = i + 1;
    const ev = sampleEvents[i];
    const timestamp = new Date(1700000000000 + seq * 60000);

    const currentHash = computeChainHash(prevHash, {
      sequenceNumber: seq,
      action: ev.action,
      actorHash: ev.actor,
      payload: ev.payload,
      timestamp,
    });

    legitimateRecords.push({
      sequenceNumber: seq,
      previousHash: prevHash,
      currentHash,
      eventPayload: canonicalStringify(ev.payload),
      actorHash: ev.actor,
      action: ev.action,
      timestamp,
    });

    prevHash = currentHash;
  }

  console.log(`[2] Se generó una cadena de ${legitimateRecords.length} eventos consecutivos con sellado HMAC-SHA256.`);

  // 2. Verificar la cadena legítima
  const initialVerification = verifyAuditChainRecords(legitimateRecords);
  console.log(`[3] Verificación inicial de la cadena legítima: ${initialVerification.valid ? "✅ VÁLIDA (100% íntegra)" : "❌ FALLIDA"}`);
  if (!initialVerification.valid) {
    throw new Error("La verificación inicial legítima falló inesperadamente");
  }

  // 3. Simulación de Ataque Interno de Manipulación (Tampering)
  // Un usuario con acceso root a la base de datos intenta anular la multa de la secuencia 3 alterando amount de 50000 a 0
  console.log("\n[!] Simulando ataque interno: Un administrador malicioso altera la multa en secuencia #3 a $0...");
  const tamperedRecords = JSON.parse(JSON.stringify(legitimateRecords));
  tamperedRecords[2].eventPayload = JSON.stringify({ ticketId: "inf-101", amount: 0, reason: "SPEEDING" });

  const tamperVerification = verifyAuditChainRecords(tamperedRecords);
  console.log(`[4] Resultado del Verificador Forense ante alteración:`);
  console.log(`    - ¿Cadena íntegra?: ${tamperVerification.valid}`);
  if (!tamperVerification.valid) {
    console.log(`    - Secuencia de ruptura detectada: #${tamperVerification.brokenAtSequence}`);
    console.log(`    - Motivo: ${tamperVerification.reason}`);
    console.log(`    - Hash esperado: ${tamperVerification.expectedHash.slice(0, 24)}...`);
    console.log(`    - Hash manipulado: ${tamperVerification.actualHash.slice(0, 24)}...`);
    console.log("    -> ✅ ATAQUE DETECTADO DETERMINÍSTICAMENTE (RQ-04 CUMPLIDO: 100% EFICACIA)");
  } else {
    throw new Error("Fallo de seguridad crítico: La manipulación no fue detectada");
  }

  // 4. Simulación de Eliminación de Evidencia (Drop Record)
  console.log("\n[!] Simulando eliminación deliberada del registro #2 de la bitácora...");
  const droppedRecords = JSON.parse(JSON.stringify(legitimateRecords));
  droppedRecords.splice(1, 1); // Eliminar elemento en índice 1 (secuencia 2)

  const dropVerification = verifyAuditChainRecords(droppedRecords);
  if (!dropVerification.valid) {
    console.log(`    - Secuencia de ruptura detectada: #${dropVerification.brokenAtSequence}`);
    console.log(`    - Motivo: ${dropVerification.reason}`);
    console.log("    -> ✅ ELIMINACIÓN DETECTADA DETERMINÍSTICAMENTE (DISCONTINUIDAD H_n / H_{n-1})");
  } else {
    throw new Error("Fallo de seguridad crítico: La supresión de registros no fue detectada");
  }

  console.log("\n===============================================================================");
  console.log(" PROTOCOLO DE AUDITORÍA FORENSE COMPLETADO EXITOSAMENTE (100% CONFORME)");
  console.log("===============================================================================\n");
}

runTamperProofSimulation();
