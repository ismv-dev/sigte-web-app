/**
 * Utilidades de minimización de datos y seudonimización integral (RT-03 / RT-04 / RQ-03 / RQ-10, Ley N° 21.719).
 *
 * Aplica técnicas de disociación y enmascaramiento sobre los datos personales
 * de conductores, guardias y administradores para que no sean fácilmente accesibles
 * ni expuestos en texto plano en interfaces operativas, bitácoras o tráfico de red.
 *
 * Módulo puro sin dependencias de Node.js, compatible tanto con el navegador como con el servidor.
 */

/**
 * Normaliza una placa patente vehicular chilena eliminando espacios, guiones y
 * pasando a mayúsculas.
 */
export function normalizePlate(plate: string): string {
  return plate.toUpperCase().replace(/[\s\-_.]/g, "");
}

/**
 * Enmascara una placa patente vehicular chilena para visualización en caseta.
 * Ejemplos: "BBCL12" -> "BB**12", "CD1234" -> "CD**34", "AB12" -> "A**2".
 */
export function maskPlate(plate?: string | null): string {
  if (!plate) return "";
  const clean = normalizePlate(plate);
  if (clean.length <= 3) return clean;
  if (clean.length <= 4) {
    return `${clean[0]}**${clean.slice(-1)}`;
  }
  const prefix = clean.slice(0, 2);
  const suffix = clean.slice(-2);
  return `${prefix}${"*".repeat(clean.length - 4)}${suffix}`;
}

/**
 * Minimiza y enmascara un nombre completo para su exposición en interfaces
 * de guardia en caseta y vistas operativas (RT-03 / RQ-03).
 * Expone únicamente el nombre de pila y la inicial del apellido
 * para prevenir el perfilamiento y la retención indebida de identidad civil.
 *
 * Ejemplos:
 *   "Juan Pablo González Astudillo" -> "Juan G."
 *   "Alejandro Vera Espinoza"       -> "Alejandro V."
 *   "Carlos Guardia Soto"           -> "Carlos G."
 *   "Juan Pérez"                    -> "Juan P."
 */
export function maskName(fullName?: string | null): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];

  const firstName = parts[0];
  const surname = parts.length === 2 ? parts[1] : parts.length === 3 ? parts[1] : parts[2];
  return `${firstName} ${surname[0].toUpperCase()}.`;
}

/**
 * Enmascara un Rol Único Tributario (RUT) chileno para evitar la exposición
 * de la clave natural civil de conductores, guardias y administradores (RT-04).
 *
 * Ejemplos:
 *   "12.345.678-9" -> "12.***.***-9"
 *   "12345678-9"   -> "12****78-9"
 *   "9.876.543-K"  -> "9.***.***-K"
 */
export function maskRut(rut?: string | null): string {
  if (!rut) return "";
  const clean = rut.trim();

  // Si tiene puntos y guión formal: "12.345.678-9"
  if (clean.includes(".")) {
    const parts = clean.split(".");
    if (parts.length === 3) {
      const first = parts[0];
      const dv = clean.split("-")[1] || "";
      return `${first}.***.***-${dv}`;
    }
  }

  // Sin puntos pero con guión: "12345678-9"
  const hyphenIdx = clean.indexOf("-");
  if (hyphenIdx > 3) {
    const body = clean.slice(0, hyphenIdx);
    const dv = clean.slice(hyphenIdx + 1);
    const prefix = body.slice(0, 2);
    const suffix = body.slice(-2);
    return `${prefix}${"*".repeat(body.length - 4)}${suffix}-${dv}`;
  }

  // Fallback genérico
  if (clean.length > 4) {
    return `${clean.slice(0, 2)}${"*".repeat(clean.length - 4)}${clean.slice(-2)}`;
  }
  return clean;
}

/**
 * Enmascara un número de teléfono protegiendo los dígitos centrales (RT-04).
 *
 * Ejemplos:
 *   "+56912345678" -> "+569****5678"
 *   "912345678"    -> "91****78"
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return "";
  const clean = phone.trim();
  if (clean.length <= 5) return clean;

  if (clean.startsWith("+569") && clean.length >= 12) {
    const prefix = clean.slice(0, 4);
    const suffix = clean.slice(-4);
    return `${prefix}****${suffix}`;
  }

  const prefix = clean.slice(0, 2);
  const suffix = clean.slice(-2);
  return `${prefix}${"*".repeat(Math.max(2, clean.length - 4))}${suffix}`;
}

/**
 * Enmascara un correo electrónico institucional protegiendo el buzón civil (RT-04).
 *
 * Ejemplos:
 *   "conductor@usm.cl" -> "c***r@usm.cl"
 *   "guardia@usm.cl"   -> "g***a@usm.cl"
 *   "admin@usm.cl"     -> "a***n@usm.cl"
 */
export function maskEmail(email?: string | null): string {
  if (!email) return "";
  const clean = email.trim();
  const atIdx = clean.indexOf("@");
  if (atIdx <= 1) return clean;

  const mailbox = clean.slice(0, atIdx);
  const domain = clean.slice(atIdx);

  if (mailbox.length <= 2) {
    return `${mailbox[0]}*${domain}`;
  }

  const firstChar = mailbox[0];
  const lastChar = mailbox[mailbox.length - 1];
  return `${firstChar}***${lastChar}${domain}`;
}

export interface PseudonymizedUserOutput {
  id: string;
  pseudoId?: string;
  name: string;
  email: string;
  role: string;
  userType?: string | null;
  rut?: string;
  phone?: string;
  position?: string | null;
  department?: string | null;
  career?: string | null;
}

/**
 * Aplica la técnica de seudonimización y disociación integral sobre los datos
 * personales de un usuario (Conductor, Guardia o Administrador) (RT-04 / RQ-10).
 *
 * Desacopla las claves naturales civiles (RUT, nombre completo, correo, teléfono)
 * sustituyéndolas por representaciones enmascaradas y un identificador seudonimizado.
 */
export function pseudonymizeUserData<
  T extends {
    id: string;
    role?: string | null;
    name?: string | null;
    email?: string | null;
    rut?: string | null;
    phone?: string | null;
    userType?: string | null;
    position?: string | null;
    department?: string | null;
    career?: string | null;
  }
>(user: T, pseudoId?: string): PseudonymizedUserOutput {
  return {
    id: user.id,
    pseudoId: pseudoId || undefined,
    name: maskName(user.name),
    email: maskEmail(user.email),
    role: user.role || "USER",
    userType: user.userType || null,
    rut: user.rut ? maskRut(user.rut) : undefined,
    phone: user.phone ? maskPhone(user.phone) : undefined,
    position: user.position || null,
    department: user.department || null,
    career: user.career || null,
  };
}
