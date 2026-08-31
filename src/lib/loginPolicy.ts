// Política de bloqueo por intentos fallidos de login. Funciones puras para
// poder testearlas sin tocar la base de datos.

export const MAX_ATTEMPTS = 5;
export const LOCK_MS = 15 * 60_000;

/** true si el próximo intento fallido debería activar el bloqueo. */
export function shouldLock(attempts: number): boolean {
  return attempts >= MAX_ATTEMPTS;
}

/** true si la cuenta sigue bloqueada al momento `now`. */
export function isLocked(lockedUntil: Date | null, now: number = Date.now()): boolean {
  return !!lockedUntil && lockedUntil.getTime() > now;
}

/** Minutos restantes de bloqueo, redondeados hacia arriba (mínimo 1). */
export function minutesRemaining(lockedUntil: Date, now: number = Date.now()): number {
  return Math.max(1, Math.ceil((lockedUntil.getTime() - now) / 60_000));
}
