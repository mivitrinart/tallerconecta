/**
 * Capa de datos · Modo demo (sin servidor).
 *
 * Implementación SIN dependencias de Node.js (no usa node:fs, node:path,
 * node:crypto). Funciona tanto en Node.js local como en Cloudflare Workers
 * (edge runtime).
 *
 * Los datos se mantienen en memoria (variable module-level). En desarrollo
 * local se pierden al reiniciar el servidor; en producción (Cloudflare)
 * se pierden al reiniciar el Worker. Para persistencia real usar D1.
 *
 * Para migrar a Supabase: implementar la misma interfaz en supabase-client.ts
 * y cambiar DATA_MODE=supabase (ver lib/database/index.ts).
 */

import type { Database } from "./types";
import { buildSeed } from "./seed";

// Caché en globalThis: en `next dev` las rutas API y las páginas se sirven
// desde bundles de módulos distintos; compartirla por globalThis permite que
// una cuenta creada vía API (registro/login) sea visible para la página
// /cuenta en el mismo proceso. En producción se usa D1 (persistente).
const g = globalThis as unknown as { __TC_DEMO_DB_CACHE?: Database | null };
let cache: Database | null = g.__TC_DEMO_DB_CACHE ?? null;

/**
 * Genera un ID único usando Web Crypto API (disponible en navegadores,
 * Node.js 19+, y Cloudflare Workers).
 */
export function uid(prefijo: string): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  return `${prefijo}_${hex}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

function seedIfMissing(): Database {
  const db = buildSeed();
  // Asegurar que email_verification_codes exista (migración de esquema)
  if (!db.email_verification_codes) {
    db.email_verification_codes = [];
  }
  return db;
}

export function readDb(): Database {
  const g = globalThis as unknown as { __TC_DEMO_DB_CACHE?: Database | null };
  if (!cache) {
    cache = g.__TC_DEMO_DB_CACHE ?? seedIfMissing();
    g.__TC_DEMO_DB_CACHE = cache;
  }
  return cache;
}

export function persist(db: Database) {
  cache = db;
  (globalThis as unknown as { __TC_DEMO_DB_CACHE?: Database | null }).__TC_DEMO_DB_CACHE = db;
}

export function mutate<T>(fn: (_db: Database) => T): T {
  const db = readDb();
  try {
    const result = fn(db);
    persist(db);
    return result;
  } catch (err) {
    // Restaurar cache desde el estado previo si la mutación falla
    readDb();
    throw err;
  }
}

export function query<T>(fn: (_db: Database) => T): T {
  return fn(readDb());
}

export function resetDemoDb(): void {
  cache = seedIfMissing();
  (globalThis as unknown as { __TC_DEMO_DB_CACHE?: Database | null }).__TC_DEMO_DB_CACHE = cache;
}

/** Próximo número de orden legible (ORD-1048…). */
export function nextOrderNumber(db: Database): string {
  db.secuencia_orden += 1;
  return `ORD-${db.secuencia_orden}`;
}
