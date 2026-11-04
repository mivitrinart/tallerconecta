import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Sincroniza automáticamente los planes de taller:
 * - Suscripciones en_prueba vencidas -> activa / starter
 * - Talleres en_prueba sin suscripción -> activo / starter
 * Se ejecuta directamente contra D1 usando el binding del Worker.
 */
export async function POST(_req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env?.taller_conecta_db;
    if (!db) {
      return NextResponse.json({ error: "D1 binding no disponible" }, { status: 500 });
    }

    const ahora = new Date().toISOString();

    // 1. Suscripciones en_prueba cuya fecha fin ya pasó -> activa / starter
    const vencidas = await db
      .prepare(
        "SELECT id, workshop_id FROM subscriptions WHERE estado = 'en_prueba' AND datetime(fin) <= datetime(?)"
      )
      .bind(ahora)
      .all();
    const rows = (vencidas.results ?? []) as { id: string; workshop_id: string }[];
    for (const sub of rows) {
      await db
        .prepare("UPDATE subscriptions SET estado = 'activa', plan = 'starter' WHERE id = ?")
        .bind(sub.id)
        .run();
      await db
        .prepare("UPDATE workshops SET estado = 'activo', plan = 'starter' WHERE id = ?")
        .bind(sub.workshop_id)
        .run();
    }

    // 2. Talleres en_prueba que NO tienen suscripción -> activo / starter
    await db
      .prepare(
        `UPDATE workshops SET estado = 'activo', plan = 'starter'
         WHERE estado = 'en_prueba'
         AND id NOT IN (SELECT workshop_id FROM subscriptions WHERE estado = 'en_prueba')`
      )
      .run();

    return NextResponse.json({ ok: true, sincronizados: rows.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error sincronizando planes" },
      { status: 500 }
    );
  }
}
