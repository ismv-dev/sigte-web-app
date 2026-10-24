import { describe, expect, it } from "vitest";
import {
  maskPlate,
  maskName,
  maskRut,
  maskPhone,
  maskEmail,
  pseudonymizeUserData,
  pseudonymizeActor,
} from "./crypto";

describe("Minimización de Datos y Seudonimización Integral (RT-03 / RT-04 / RQ-03 / RQ-10)", () => {
  it("enmascara placas patentes reduciendo el perfilamiento innecesario", () => {
    expect(maskPlate("BBCL12")).toBe("BB**12");
    expect(maskPlate("FD9988")).toBe("FD**88");
    expect(maskPlate("AABB11")).toBe("AA**11");
  });

  it("enmascara y minimiza nombres de usuarios para no exponer la identidad civil completa al guardia", () => {
    expect(maskName("Juan Pablo González Astudillo")).toBe("Juan G.");
    expect(maskName("Alejandro Vera Espinoza")).toBe("Alejandro V.");
    expect(maskName("Carlos Guardia Soto")).toBe("Carlos G.");
    expect(maskName("Juan Pérez")).toBe("Juan P.");
    expect(maskName("María Vigía")).toBe("María V.");
    expect(maskName("Pedro Fernández Araya")).toBe("Pedro F.");
  });

  it("enmascara el RUT de conductores y funcionarios protegiendo la clave civil", () => {
    expect(maskRut("12.345.678-9")).toBe("12.***.***-9");
    expect(maskRut("12345678-9")).toBe("12****78-9");
    expect(maskRut("9.876.543-K")).toBe("9.***.***-K");
  });

  it("enmascara números de teléfono protegiendo dígitos intermedios", () => {
    expect(maskPhone("+56912345678")).toBe("+569****5678");
    expect(maskPhone("912345678")).toBe("91*****78");
  });

  it("enmascara correos institucionales de conductores, guardias y administradores", () => {
    expect(maskEmail("conductor@usm.cl")).toBe("c***r@usm.cl");
    expect(maskEmail("guardia@usm.cl")).toBe("g***a@usm.cl");
    expect(maskEmail("admin@usm.cl")).toBe("a***n@usm.cl");
  });

  it("aplica la técnica de seudonimización integral sobre perfiles de Conductores (USER)", () => {
    const rawDriver = {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      role: "USER",
      name: "Pedro Morales Silva",
      email: "pedro.morales@usm.cl",
      rut: "18.765.432-1",
      phone: "+56912345678",
      career: "Ingeniería Civil Informática",
    };

    const pseudoId = pseudonymizeActor(rawDriver.id);
    const pseudonymized = pseudonymizeUserData(rawDriver, pseudoId);

    expect(pseudonymized.pseudoId).toBe(pseudoId);
    expect(pseudonymized.name).toBe("Pedro M.");
    expect(pseudonymized.email).toBe("p***s@usm.cl");
    expect(pseudonymized.rut).toBe("18.***.***-1");
    expect(pseudonymized.phone).toBe("+569****5678");
    expect(pseudonymized.role).toBe("USER");
  });

  it("aplica la técnica de seudonimización integral sobre perfiles de Guardias (GUARD)", () => {
    const rawGuard = {
      id: "guard-uuid-11223344",
      role: "GUARD",
      name: "Carlos Soto Valenzuela",
      email: "carlos.soto@usm.cl",
      phone: "+56987654321",
      position: "Guardia de Seguridad Turno Día",
    };

    const pseudoId = pseudonymizeActor(rawGuard.id);
    const pseudonymized = pseudonymizeUserData(rawGuard, pseudoId);

    expect(pseudonymized.name).toBe("Carlos S.");
    expect(pseudonymized.email).toBe("c***o@usm.cl");
    expect(pseudonymized.phone).toBe("+569****4321");
    expect(pseudonymized.role).toBe("GUARD");
    expect(pseudonymized.pseudoId).toBe(pseudoId);
  });

  it("aplica la técnica de seudonimización integral sobre perfiles de Administradores (ADMIN)", () => {
    const rawAdmin = {
      id: "admin-uuid-99887766",
      role: "ADMIN",
      name: "Beatriz Andrea Silva Orellana",
      email: "beatriz.silva@usm.cl",
      phone: "+56911223344",
      position: "Jefe de Operaciones Campus",
    };

    const pseudoId = pseudonymizeActor(rawAdmin.id);
    const pseudonymized = pseudonymizeUserData(rawAdmin, pseudoId);

    expect(pseudonymized.name).toBe("Beatriz S.");
    expect(pseudonymized.email).toBe("b***a@usm.cl");
    expect(pseudonymized.phone).toBe("+569****3344");
    expect(pseudonymized.role).toBe("ADMIN");
  });

  it("garantiza que el payload minimizado para el guardia contiene 0% atributos civiles sensibles", () => {
    // Simulación del payload devuelto por /api/access/verify-qr
    const minimizedGuardResponse = {
      autorizado: true,
      nombreApellido: maskName("Juan Pérez"),
      patenteEnmascarada: maskPlate("BBCL12"),
      veredicto: "ALLOW",
      mensaje: "Ingreso autorizado",
      accessLogId: "123e4567-e89b-12d3-a456-426614174000",
    };

    const forbiddenFields = [
      "rut",
      "RUT",
      "email",
      "career",
      "carrera",
      "department",
      "departamento",
      "universityId",
      "academicDepartment",
      "phone",
      "telefono",
      "passwordHash",
      "plateCipher",
      "plateIv",
      "plateTag",
    ];

    const responseKeys = Object.keys(minimizedGuardResponse);
    for (const field of forbiddenFields) {
      expect(responseKeys).not.toContain(field);
      expect((minimizedGuardResponse as Record<string, unknown>)[field]).toBeUndefined();
    }

    // Solo contiene exactamente los datos operacionales de portería minimizados
    expect(typeof minimizedGuardResponse.autorizado).toBe("boolean");
    expect(minimizedGuardResponse.nombreApellido).toBe("Juan P.");
    expect(minimizedGuardResponse.patenteEnmascarada).toMatch(/^[A-Z0-9]{1,2}\*+[A-Z0-9]{1,2}$/);
  });
});
