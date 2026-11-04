/**
 * lib/database/index.ts
 *
 * Punto de entrada único para la capa de datos.
 * En modo demo usa demo-store (archivo JSON local).
 * En modo D1 (Cloudflare Pages) usa d1-store.
 *
 * Las funciones query() y mutate() son síncronas en la interfaz pública
 * para mantener compatibilidad con todo el código existente.
 * Las escrituras a D1 se persisten async en segundo plano.
 */

import type { Database } from "./types";
import { D1Store, getD1Store, uid, nowISO } from "./d1-store";
import * as demoStore from "./demo-store";
import { buildSeed } from "./seed";

// Variable global para el store activo del request actual
let currentStore: D1Store | null = null;

/**
 * Establece el store activo para el request actual.
 * Debe llamarse al inicio de cada API route o server component
 * que necesite acceso a la base de datos.
 */
export function setStore(store: D1Store | null): void {
  currentStore = store;
}

/**
 * Obtiene el store activo. Puede ser null si no hay D1 configurado.
 */
export function getStore(): D1Store | null {
  return currentStore;
}

/**
 * Inicializa el store desde el entorno de Cloudflare (env).
 * Llama esto en el middleware o al inicio de cada ruta.
 */
export async function initStoreFromEnv(env: any): Promise<void> {
  const initialData = await D1Store.loadFromD1(env.taller_conecta_db);
  setStore(getD1Store(env, initialData));
}

// ── Re-exportar todo de demo-store para modo local ────────────────────

export { demoStore };
export { buildSeed };
export { uid, nowISO } from "./d1-store";

// ── Funciones query / mutate que delegan al store activo ──────────────

/**
 * Lectura: ejecuta fn sobre el store activo.
 * Si no hay D1 store, usa demo-store.
 */
export function query<T>(fn: (db: Database) => T): T {
  const store = currentStore;
  if (store) {
    return store.query(fn);
  }
  return demoStore.query(fn);
}

/**
 * Escritura: ejecuta fn sobre el cache en memoria y programa la persistencia.
 * Si no hay D1 store, usa demo-store (persistencia síncrona al archivo).
 */
export function mutate<T>(fn: (db: Database) => T): T {
  const store = currentStore;
  if (store) {
    return store.mutate(fn);
  }
  return demoStore.mutate(fn);
}

// ── nextOrderNumber ───────────────────────────────────────────────────

export function nextOrderNumber(workshopId: string): string {
  const store = currentStore;
  if (store) {
    return store.nextOrderNumber(workshopId);
  }
  return demoStore.nextOrderNumber(demoStore.readDb());
}

// ── resetDemoDb ───────────────────────────────────────────────────────

export function resetDemoDb(): void {
  const store = currentStore;
  if (store) {
    store.resetDemoDb();
    return;
  }
  demoStore.resetDemoDb();
}

// ── Función para forzar persistencia pendiente ────────────────────────

export async function flushPendingWrites(): Promise<void> {
  const store = currentStore;
  if (store) {
    await store.flush();
  }
}

// ── readDb y buildSeed (solo modo demo local) ─────────────────────────

export function readDb(): Database {
  return demoStore.readDb();
}

export function buildSeedLocal(): Database {
  return buildSeed();
}
