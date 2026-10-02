export type AppVersion = "v1" | "v2" | "v3";

export type Feature =
  | "qr"                // v1+ QR generation and reading
  | "vehicles"          // v1+ Personal vehicle registration and management
  | "infractions"       // v1+ Infraction management and tracking
  | "users"             // v1+ User management (admin)
  | "notifications"     // v1+ User notifications
  | "access_records"    // v2+ Access and exit registration & history (bitácora de accesos)
  | "parking_monitoring"; // v3+ Parking occupancy in real-time, block management

export interface VersionInfo {
  id: AppVersion;
  number: number;
  label: string;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  features: { id: Feature; name: string; description: string; included: boolean }[];
}

export const VERSIONS: Record<AppVersion, VersionInfo> = {
  v1: {
    id: "v1",
    number: 1,
    label: "Versión 1",
    name: "v1 · MVP Identidad & Vehículos",
    badge: "v1 · Sprint 1",
    tagline: "Generación y lectura de QR, registro de vehículos e infracciones",
    description: "Versión inicial del sistema enfocada en la identificación de vehículos mediante códigos QR dinámicos, registro de patentes y gestión de infracciones sin bitácora de accesos ni monitoreo de cupos.",
    features: [
      { id: "qr", name: "Generación y lectura de QR", description: "Códigos QR firmados con HMAC y validación por cámara", included: true },
      { id: "vehicles", name: "Registro de vehículos personales", description: "Gestión de patentes autorizadas para funcionarios y alumnos", included: true },
      { id: "infractions", name: "Gestión de infracciones", description: "Emisión de multas, reconocimiento y seguimiento", included: true },
      { id: "users", name: "Gestión de usuarios", description: "Administración de usuarios institucionales y roles", included: true },
      { id: "notifications", name: "Notificaciones", description: "Avisos al usuario sobre estados de vehículos e infracciones", included: true },
      { id: "access_records", name: "Registro de accesos (IN/OUT)", description: "Control y bitácora de entradas y salidas", included: false },
      { id: "parking_monitoring", name: "Monitoreo de estacionamiento", description: "Ocupación en tiempo real y gestión de bloques", included: false },
    ],
  },
  v2: {
    id: "v2",
    number: 2,
    label: "Versión 2",
    name: "v2 · Control de Acceso & Bitácora",
    badge: "v2 · Sprint 2",
    tagline: "v1 + Registro de accesos y salidas (bitácora)",
    description: "Incorpora el registro operativo de entradas y salidas en el pórtico y la bitácora histórica de accesos para conductores, guardias y administradores.",
    features: [
      { id: "qr", name: "Generación y lectura de QR", description: "Códigos QR firmados con HMAC y validación por cámara", included: true },
      { id: "vehicles", name: "Registro de vehículos personales", description: "Gestión de patentes autorizadas para funcionarios y alumnos", included: true },
      { id: "infractions", name: "Gestión de infracciones", description: "Emisión de multas, reconocimiento y seguimiento", included: true },
      { id: "users", name: "Gestión de usuarios", description: "Administración de usuarios institucionales y roles", included: true },
      { id: "notifications", name: "Notificaciones", description: "Avisos al usuario sobre estados de vehículos e infracciones", included: true },
      { id: "access_records", name: "Registro de accesos (IN/OUT)", description: "Control y bitácora de entradas y salidas con exportación CSV", included: true },
      { id: "parking_monitoring", name: "Monitoreo de estacionamiento", description: "Ocupación en tiempo real y gestión de bloques", included: false },
    ],
  },
  v3: {
    id: "v3",
    number: 3,
    label: "Versión 3",
    name: "v3 · Monitoreo & Sistema Completo",
    badge: "v3 · Sprint 3",
    tagline: "v2 + Monitoreo de estacionamientos en tiempo real (Completo)",
    description: "Versión final que incluye todas las funcionalidades: monitoreo de cupos en tiempo real, gestión de bloques de estacionamiento, mapa de ocupación y semáforos.",
    features: [
      { id: "qr", name: "Generación y lectura de QR", description: "Códigos QR firmados con HMAC y validación por cámara", included: true },
      { id: "vehicles", name: "Registro de vehículos personales", description: "Gestión de patentes autorizadas para funcionarios y alumnos", included: true },
      { id: "infractions", name: "Gestión de infracciones", description: "Emisión de multas, reconocimiento y seguimiento", included: true },
      { id: "users", name: "Gestión de usuarios", description: "Administración de usuarios institucionales y roles", included: true },
      { id: "notifications", name: "Notificaciones", description: "Avisos al usuario sobre estados de vehículos e infracciones", included: true },
      { id: "access_records", name: "Registro de accesos (IN/OUT)", description: "Control y bitácora de entradas y salidas con exportación CSV", included: true },
      { id: "parking_monitoring", name: "Monitoreo de estacionamiento", description: "Ocupación en tiempo real, capacidad y gestión de bloques", included: true },
    ],
  },
};

export const VERSION_LIST: VersionInfo[] = [VERSIONS.v1, VERSIONS.v2, VERSIONS.v3];

export function isValidVersion(v: string | undefined | null): v is AppVersion {
  return v === "v1" || v === "v2" || v === "v3";
}

export function parseVersion(v: string | undefined | null, fallback: AppVersion = "v3"): AppVersion {
  if (isValidVersion(v)) return v;
  return fallback;
}

export function isFeatureEnabled(version: AppVersion, feature: Feature): boolean {
  switch (feature) {
    case "qr":
    case "vehicles":
    case "infractions":
    case "users":
    case "notifications":
      return true;
    case "access_records":
      return version === "v2" || version === "v3";
    case "parking_monitoring":
      return version === "v3";
    default:
      return false;
  }
}

export function canAccessRoute(version: AppVersion, pathname: string): boolean {
  // Normalize path removing trailing slash
  const clean = pathname.replace(/\/$/, "");

  // Pages requiring access_records (v2+)
  if (
    clean.endsWith("/user/access") ||
    clean.endsWith("/guard/history") ||
    clean.endsWith("/admin/access")
  ) {
    return isFeatureEnabled(version, "access_records");
  }

  // Pages requiring parking_monitoring (v3 only)
  if (
    clean.endsWith("/guard/occupancy") ||
    clean.endsWith("/admin/parking")
  ) {
    return isFeatureEnabled(version, "parking_monitoring");
  }

  return true;
}

export function getRedirectForDisallowedRoute(targetVersion: AppVersion, currentPath: string): string {
  // Extract path without version prefix
  const parts = currentPath.split("/").filter(Boolean);
  const startIdx = isValidVersion(parts[0]) ? 1 : 0;
  const pathWithoutVersion = "/" + parts.slice(startIdx).join("/");

  // Check if target allows this path
  if (canAccessRoute(targetVersion, pathWithoutVersion)) {
    return `/${targetVersion}${pathWithoutVersion === "/" ? "" : pathWithoutVersion}`;
  }

  // If disallowed, return sensible fallback within the portal
  if (pathWithoutVersion.startsWith("/admin")) {
    return `/${targetVersion}/admin`;
  }
  if (pathWithoutVersion.startsWith("/guard")) {
    return `/${targetVersion}/guard`;
  }
  if (pathWithoutVersion.startsWith("/user")) {
    return `/${targetVersion}/user`;
  }

  return `/${targetVersion}`;
}

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export function getUserNav(version: AppVersion): NavItem[] {
  const items: NavItem[] = [
    { href: `/${version}/user`, label: "Inicio", icon: "home" },
    { href: `/${version}/user/vehicles`, label: "Mis vehículos", icon: "car" },
    { href: `/${version}/user/qr`, label: "QR de acceso", icon: "qr" },
  ];

  if (isFeatureEnabled(version, "access_records")) {
    items.push({ href: `/${version}/user/access`, label: "Mis accesos", icon: "history" });
  }

  items.push(
    { href: `/${version}/user/infractions`, label: "Infracciones", icon: "file" },
    { href: `/${version}/user/notifications`, label: "Notificaciones", icon: "bell" }
  );

  return items;
}

export interface NavGroup {
  grp: string;
  items: NavItem[];
}

export function getGuardNav(version: AppVersion): NavGroup[] {
  const items: NavItem[] = [];

  if (isFeatureEnabled(version, "access_records")) {
    // In v2 and v3, Guard operates entry/exit access control
    items.push({ href: `/${version}/guard`, label: "Control de acceso", icon: "barrier" });
  } else {
    // In v1, Guard only validates QR and vehicle identification
    items.push({ href: `/${version}/guard`, label: "Validar QR / Vehículo", icon: "qr" });
  }

  if (isFeatureEnabled(version, "parking_monitoring")) {
    items.push({ href: `/${version}/guard/occupancy`, label: "Estacionamiento", icon: "parking" });
  }

  items.push({ href: `/${version}/guard/search`, label: "Buscar vehículo", icon: "search" });
  items.push({ href: `/${version}/guard/infractions`, label: "Infracciones", icon: "shieldAlert" });

  if (isFeatureEnabled(version, "access_records")) {
    items.push({ href: `/${version}/guard/history`, label: "Historial", icon: "history" });
  }

  return [{ grp: "Operación", items }];
}

export function getAdminNav(version: AppVersion): NavGroup[] {
  const items: NavItem[] = [
    { href: `/${version}/admin`, label: "Panel", icon: "dashboard" },
    { href: `/${version}/admin/users`, label: "Usuarios", icon: "users" },
    { href: `/${version}/admin/vehicles`, label: "Vehículos", icon: "car" },
  ];

  if (isFeatureEnabled(version, "parking_monitoring")) {
    items.push({ href: `/${version}/admin/parking`, label: "Bloques", icon: "parking" });
  }

  if (isFeatureEnabled(version, "access_records")) {
    items.push({ href: `/${version}/admin/access`, label: "Accesos", icon: "history" });
  }

  items.push({ href: `/${version}/admin/infractions`, label: "Infracciones", icon: "shieldAlert" });

  return [{ grp: "Administración", items }];
}
