/**
 * Capa de datos · Modo demo para Cloudflare Workers (Edge).
 *
 * Usa almacenamiento en memoria (Map) en lugar de node:fs, ya que
 * node:fs no está disponible en el edge runtime de Cloudflare Workers.
 * Los datos se pierden al reiniciar el Worker, pero es suficiente para
 * demos y pruebas.
 */

import type { Database } from "./types";
import crypto from "crypto";

const DB_VERSION = 9;

// Caché en globalThis: en `next dev` las rutas API y las páginas se sirven
// desde bundles de módulos distintos; compartirla por globalThis permite que
// una cuenta creada vía API (registro/login) sea visible para la página
// /cuenta en el mismo proceso. En producción se usa D1 (persistente).
const g = globalThis as unknown as { __TC_DEMO_DB_CACHE?: Database | null };
let cache: Database | null = g.__TC_DEMO_DB_CACHE ?? null;

export function uid(prefijo: string): string {
  return `${prefijo}_${crypto.randomBytes(8).toString("hex")}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

function seedIfMissing(): Database {
  const { buildSeed } = require("./seed");
  const db = buildSeed();
  // Asegurar que email_verification_codes exista
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

export function mutate<T>(fn: (db: Database) => T): T {
  const db = readDb();
  const result = fn(db);
  persist(db);
  return result;
}

export function query<T>(fn: (db: Database) => T): T {
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
