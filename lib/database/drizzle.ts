/**
 * Tipado de Drizzle ORM sobre el esquema del proyecto. La capa de operaciones
 * en tiempo de ejecución sigue siendo D1Store (D1) a través de
 * lib/database/index.ts; este helper es solo de contrato tipado y no se ejecuta
 * en la ruta crítica de Workers.
 */
import * as schema from "@/drizzle/schema";

export type DrizzleSchema = typeof schema;

/**
 * Cliente Drizzle tipado sobre una interfaz D1-like. Se hace cast porque
 * D1Database no implementa la interfaz de conexión de Drizzle; el helper no
 * es parte de la ruta crítica de ejecución.
 */
export type DrizzleClient = Record<string, unknown>;

export function createDrizzleOnD1(db: unknown): DrizzleClient {
  return db as unknown as DrizzleClient;
}

export { schema };
