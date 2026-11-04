import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { initStore } from "@/lib/api/init-store";
import { caducarSuscripcionesVencidas } from "@/lib/orders/workflows";

/**
 * Handler unificado de cron triggers.
 * Cloudflare invoca este endpoint en los horarios definidos en wrangler.toml.
 * Se distingue la tarea por la hora actual (UTC) o por header `cf-cron-trigger`.
 */
export async function GET(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env?.taller_conecta_db;
    if (!db) {
      return NextResponse.json({ error: "D1 binding no disponible" }, { status: 500 });
    }

    // Inicializar store para que mutate() funcione
    await initStore();

    const now = new Date();
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();

    const results: Record<string, unknown> = {};

    // 03:00 UTC — caducar suscripciones de prueba vencidas
    if (hour === 3 && minute === 0) {
      const r = caducarSuscripcionesVencidas();
      results.caducarSuscripciones = r;
    }

    // 04:00 UTC — recordatorios de mantenimiento (3+ meses)
    if (hour === 4 && minute === 0) {
      // TODO: implementar envío de recordatorios
      results.recordatoriosMantenimiento = { ok: true, message: "pendiente implementar" };
    }

    // Cada hora (minuto 0) — limpieza de sesiones expiradas
    if (minute === 0) {
      // TODO: implementar limpieza de sesiones
      results.limpiezaSesiones = { ok: true, message: "pendiente implementar" };
    }

    // Cada 15 min (0, 15, 30, 45) — sync de planes / auditoría
    if (minute % 15 === 0) {
      const vencidas = await db
        .prepare(
          "SELECT id, workshop_id FROM subscriptions WHERE estado = 'en_prueba' AND datetime(fin) <= datetime(?)"
        )
        .bind(now.toISOString())
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
      results.syncPlanes = { ok: true, sincronizados: rows.length };
    }

    return NextResponse.json({ ok: true, timestamp: now.toISOString(), results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error en cron" },
      { status: 500 }
    );
  }
}