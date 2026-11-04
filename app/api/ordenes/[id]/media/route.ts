import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { mediaSchema } from "@/lib/validations/schemas";
import { addMedia } from "@/lib/orders/workflows";
import { query } from "@/lib/database/index";

/**
 * Evidencias fotográficas (antes / durante / después).
 * En modo demo la imagen viaja como data-URI (redimensionada en el cliente).
 * En producción se sube a Supabase Storage (privado) y aquí llega la ruta.
 */
export async function POST(req: NextRequest, { params: paramsP }: { params: Promise<{ id: string }> }) {
  await initStore();
  const params = await paramsP;
  const auth = await guardStaff("media.upload");
  if (!auth.ok) return auth.response;

  const parsed = mediaSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);
  if (parsed.data.url.length > 2_500_000) {
    return fail("La imagen es demasiado grande para el modo demo (máx. ~1.8 MB).", 413);
  }

  const order = query((db) => db.service_orders.find((o) => o.id === params.id && o.workshop_id === auth.workshopId)) ?? null;
  if (!order) return fail("Orden no encontrada en este taller.", 404);
  if (auth.session.rol === "mechanic" && order.responsable_id !== auth.session.user_id) {
    return fail("Solo puedes subir evidencias a órdenes asignadas a ti.", 403);
  }

  const resultado = addMedia(params.id, parsed.data, auth.actor, auth.workshopId);
  if (!resultado.ok) return fail(resultado.error ?? "No se pudo guardar la evidencia.", 400);
  return okJson({ id: params.id });
}
