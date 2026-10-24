import { describe, expect, it } from "vitest";
import {
  GENESIS_HASH,
  canonicalStringify,
  computeChainHash,
  verifyAuditChainRecords,
} from "./audit-chain";

describe("audit-chain.ts - Integridad Forense y Tamper-Proof Chaining (RT-06 / RQ-04)", () => {
  it("serializa JSON de manera determinista sin importar el orden de las claves", () => {
    const objA = { z: 1, a: "foo", m: { y: 2, b: 3 } };
    const objB = { a: "foo", m: { b: 3, y: 2 }, z: 1 };
    expect(canonicalStringify(objA)).toBe(canonicalStringify(objB));
  });

  it("verifica exitosamente una cadena legítima de eventos", () => {
    const records = [];
    let prevHash = GENESIS_HASH;

    for (let seq = 1; seq <= 5; seq++) {
      const now = new Date(1700000000000 + seq * 1000);
      const payload = { event: "ACCESS_GRANTED", vehiclePlate: `PLATE${seq}` };
      const currentHash = computeChainHash(prevHash, {
        sequenceNumber: seq,
        action: "ACCESS_GRANTED",
        actorHash: "actor_guard_hash",
        payload,
        timestamp: now,
      });

      records.push({
        sequenceNumber: seq,
        previousHash: prevHash,
        currentHash,
        eventPayload: canonicalStringify(payload),
        actorHash: "actor_guard_hash",
        action: "ACCESS_GRANTED",
        timestamp: now,
      });

      prevHash = currentHash;
    }

    const verification = verifyAuditChainRecords(records);
    expect(verification.valid).toBe(true);
    expect(verification.count).toBe(5);
  });

  it("detecta al 100% cualquier mutación o alteración de datos (Tampering)", () => {
    const records = [];
    let prevHash = GENESIS_HASH;

    for (let seq = 1; seq <= 5; seq++) {
      const now = new Date(1700000000000 + seq * 1000);
      const payload = { event: "INFRACTION_ISSUED", amount: 50000 };
      const currentHash = computeChainHash(prevHash, {
        sequenceNumber: seq,
        action: "INFRACTION_ISSUED",
        actorHash: "guard_actor_1",
        payload,
        timestamp: now,
      });

      records.push({
        sequenceNumber: seq,
        previousHash: prevHash,
        currentHash,
        eventPayload: canonicalStringify(payload),
        actorHash: "guard_actor_1",
        action: "INFRACTION_ISSUED",
        timestamp: now,
      });

      prevHash = currentHash;
    }

    // Un atacante altera internamente la multa del registro 3 en la base de datos
    records[2].eventPayload = JSON.stringify({ event: "INFRACTION_ISSUED", amount: 0 });

    const verification = verifyAuditChainRecords(records);
    expect(verification.valid).toBe(false);
    if (!verification.valid) {
      expect(verification.brokenAtSequence).toBe(3);
      expect(verification.reason).toContain("Tampering");
    }
  });

  it("detecta la eliminación o supresión de un registro intermedio de la base de datos", () => {
    const records = [];
    let prevHash = GENESIS_HASH;

    for (let seq = 1; seq <= 4; seq++) {
      const now = new Date(1700000000000 + seq * 1000);
      const payload = { action: `EVENT_${seq}` };
      const currentHash = computeChainHash(prevHash, {
        sequenceNumber: seq,
        action: "EVENT",
        actorHash: "system",
        payload,
        timestamp: now,
      });

      records.push({
        sequenceNumber: seq,
        previousHash: prevHash,
        currentHash,
        eventPayload: canonicalStringify(payload),
        actorHash: "system",
        action: "EVENT",
        timestamp: now,
      });

      prevHash = currentHash;
    }

    // Se borra el registro 2
    records.splice(1, 1);

    const verification = verifyAuditChainRecords(records);
    expect(verification.valid).toBe(false);
    if (!verification.valid) {
      expect(verification.brokenAtSequence).toBe(3);
      expect(verification.reason).toContain("Discontinuidad");
    }
  });
});
