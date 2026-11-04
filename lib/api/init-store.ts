import { initStoreFromEnv } from "@/lib/database/index";

/**
 * Inicializa el D1Store con el env de Cloudflare Pages (OpenNext).
 * En desarrollo local (sin env), no hace nada y se usa demo-store.
 */
export async function initStore(): Promise<void> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    if (env?.taller_conecta_db) {
      await initStoreFromEnv(env);
      return;
    }
  } catch {
    /* Sin D1 binding disponible: se usa demo-store como respaldo */
  }
}

/**
 * Persiste los cambios pendientes a D1.
 * Llamar al final de cada handler que hace escrituras.
 */
export async function flushStore(): Promise<void> {
  const { flushPendingWrites } = await import("@/lib/database/index");
  await flushPendingWrites();
}
