/**
 * Lee un secreto de entorno. En producción, nunca cae a un valor por
 * defecto: si falta, revienta al arrancar en vez de firmar JWT/QR con un
 * secreto predecible y conocido (visible en este mismo código).
 */
export function requireSecret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `Falta la variable de entorno ${name} en producción. No se usa ningún valor por defecto por seguridad.`
    );
  }
  return devFallback;
}
