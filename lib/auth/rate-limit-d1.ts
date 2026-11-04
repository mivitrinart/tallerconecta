/**
 * Rate limiting persistente en Cloudflare D1.
 *
 * A diferencia de lib/auth/rate-limit.ts (Map en memoria del isolate, que se
 * reinicia y no se comparte entre instancias del Worker), este módulo escribe
 * en D1 con consultas PREPARADAS (SQL parametrizado, sin concatenar strings),
 * así el límite es real y compartido entre todas las réplicas del edge.
 *
 * Uso típico en rutas sensibles (login, registro, verificación):
 *   const rl = await verificarRateLimitD1(req, "/api/auth/login", 10, 60_000);
 *   if (!rl.permitido) return 429 con Retry-After.
 */

export interface ResultadoRateLimit {
  permitido: boolean;
  restante: number;
  retryAfter?: number; // segundos
}

interface D1Like {
  prepare(sql: string): {
    bind(...args: unknown[]): {
      run(): Promise<unknown>;
      all<T = unknown>(): Promise<{ results: T[] }>;
      first<T = unknown>(): Promise<T | null>;
    };
  };
}

async function obtenerD1(): Promise<D1Like | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    return (env?.taller_conecta_db as unknown as D1Like) ?? null;
  } catch {
    return null; // desarrollo local sin binding → el caller usa el fallback en memoria
  }
}

/** Crea la tabla si no existe (idempotente; también está en schema.sql). */
async function asegurarTabla(db: D1Like): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS rate_limit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clave TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`
    )
    .bind()
    .run();
  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_rle_clave_tiempo ON rate_limit_events (clave, created_at)`)
    .bind()
    .run();
}

/**
 * Verifica y registra un intento para `clave` (p. ej. "ip:/api/auth/login").
 * Ventana deslizante de `ventanaMs` con máximo `limite` intentos.
 */
export async function verificarRateLimitD1(
  clave: string,
  limite: number,
  ventanaMs: number
): Promise<ResultadoRateLimit> {
  const db = await obtenerD1();
  if (!db) {
    // Sin D1 (dev local): no bloquear aquí; el rate-limit en memoria de la ruta aplica.
    return { permitido: true, restante: limite };
  }
  await asegurarTabla(db);
  const ahora = Date.now();
  const inicioVentana = ahora - ventanaMs;

  // Limpieza oportunista (máx. 1 de cada 50 llamadas) para no crecer la tabla.
  if (Math.random() < 0.02) {
    await db.prepare(`DELETE FROM rate_limit_events WHERE created_at < ?`).bind(inicioVentana - 3_600_000).run();
  }

  const fila = await db
    .prepare(`SELECT COUNT(*) AS n FROM rate_limit_events WHERE clave = ? AND created_at > ?`)
    .bind(clave, inicioVentana)
    .first<{ n: number }>();

  const usado = Number(fila?.n ?? 0);
  if (usado >= limite) {
    const primera = await db
      .prepare(`SELECT MIN(created_at) AS m FROM rate_limit_events WHERE clave = ? AND created_at > ?`)
      .bind(clave, inicioVentana)
      .first<{ m: number | null }>();
    const retryAfter = primera?.m ? Math.max(1, Math.ceil((primera.m + ventanaMs - ahora) / 1000)) : Math.ceil(ventanaMs / 1000);
    return { permitido: false, restante: 0, retryAfter };
  }

  await db.prepare(`INSERT INTO rate_limit_events (clave, created_at) VALUES (?, ?)`).bind(clave, ahora).run();
  return { permitido: true, restante: limite - usado - 1 };
}

/** Clave compuesta IP + ruta para el rate limiting por endpoint. */
export function claveRateLimit(ip: string, ruta: string): string {
  return `${ip}|${ruta}`;
}
