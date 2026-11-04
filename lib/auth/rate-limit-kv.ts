/**
 * Rate limiting persistente en Cloudflare KV para rutas de autenticación.
 *
 * Ventana fija por intervalo de tiempo; el contador se comparte entre todas
 * las réplicas del Worker porque vive en KV (no en memoria del isolate).
 * Cada entrada expira al terminar su ventana (expirationTtl).
 *
 * Uso: verificarRateLimitKV(clave, limite, ventanaMs)
 */
export interface ResultadoRateLimit {
  permitido: boolean;
  restante: number;
  retryAfter?: number; // segundos
}

interface KVStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

async function getKV(): Promise<KVStore | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    return (env?.RATE_LIMIT_KV as KVStore | undefined) ?? null;
  } catch {
    return null; // sin binding (dev local): no bloquear, falla en memoria de la ruta
  }
}

/** Clave de ventana: agrupa intentos por el tramo de tiempo actual. */
function claveVentana(clave: string, ahora: number, ventanaMs: number): string {
  const ventana = Math.floor(ahora / ventanaMs);
  return `${clave}|v${ventana}`;
}

/**
 * Verifica y registra un intento para `clave` dentro de una ventana fija de
 * `ventanaMs` con máximo `limite` intentos.
 */
export async function verificarRateLimitKV(
  clave: string,
  limite: number,
  ventanaMs: number
): Promise<ResultadoRateLimit> {
  const kv = await getKV();
  const ahora = Date.now();
  const inicioVentana = Math.floor(ahora / ventanaMs) * ventanaMs;
  const finVentana = inicioVentana + ventanaMs;
  const ttlSegundos = Math.max(60, Math.ceil((finVentana - ahora) / 1000) + 1);
  const ck = claveVentana(clave, ahora, ventanaMs);

  if (!kv) {
    return { permitido: true, restante: limite };
  }

  let actual = 0;
  const raw = await kv.get(ck);
  if (raw) actual = Number(raw) || 0;

  if (actual >= limite) {
    return { permitido: false, restante: 0, retryAfter: Math.ceil((finVentana - ahora) / 1000) };
  }

  await kv.put(ck, String(actual + 1), { expirationTtl: ttlSegundos });
  return { permitido: true, restante: limite - actual - 1 };
}

/** Clave compuesta IP + ruta para el rate limiting por endpoint. */
export function claveRateLimitKV(ip: string, ruta: string): string {
  return `${ip}|${ruta}`;
}
