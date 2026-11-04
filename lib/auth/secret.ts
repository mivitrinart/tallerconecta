/**
 * Obtención diferida (lazy) de la clave JWT compartida entre Node (session.ts)
 * y Edge Runtime (middleware.ts).
 *
 * - En producción (NODE_ENV === "production" fuera de la fase de compilación):
 *   exige obligatoriamente un AUTH_SECRET real de ≥ 32 caracteres y rechaza el
 *   placeholder de .env.example.
 * - En desarrollo local / pruebas / fase `next build`:
 *   nunca rompe la evaluación de módulos y permite arrancar `next dev` incluso
 *   antes de crear .env (además `npm run dev` autogenera un .env seguro con
 *   scripts/ensure-env.mjs).
 */

const PLACEHOLDER_PREFIX = "cambiar-por-un-secreto";
const DEV_FALLBACK = "taller-conecta-solo-desarrollo-local-no-usar-en-produccion-2026";

let cachedRaw: string | null = null;
let cachedBytes: Uint8Array | null = null;
let warnedDev = false;

export function getJwtSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET?.trim() ?? "";
  const esPlaceholder = raw.toLowerCase().startsWith(PLACEHOLDER_PREFIX);
  const esValido = raw.length >= 32 && !esPlaceholder;

  if (esValido) {
    if (cachedRaw !== raw || !cachedBytes) {
      cachedRaw = raw;
      cachedBytes = new TextEncoder().encode(raw);
    }
    return cachedBytes;
  }

  const enBuild = process.env.NEXT_PHASE === "phase-production-build";
  const enProduccion = process.env.NODE_ENV === "production" && !enBuild;

  if (enProduccion && !esValido) {
    // En producción sin AUTH_SECRET válido, lanzar error claro (no 500 opaco)
    throw new Error(
      "AUTH_SECRET no está configurado o tiene menos de 32 caracteres. " +
        "Configura un AUTH_SECRET aleatorio de al menos 32 caracteres en wrangler secret put AUTH_SECRET."
    );
  }

  if (!warnedDev && !enBuild) {
    warnedDev = true;
    console.warn(
      "[Taller Conecta · dev] AUTH_SECRET no está definido o usa el valor de ejemplo; " +
        "usando clave temporal exclusiva para desarrollo local."
    );
  }

  if (cachedRaw !== DEV_FALLBACK || !cachedBytes) {
    cachedRaw = DEV_FALLBACK;
    cachedBytes = new TextEncoder().encode(DEV_FALLBACK);
  }
  return cachedBytes;
}
