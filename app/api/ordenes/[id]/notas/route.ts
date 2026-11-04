import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { updateEstimatedDate, updateOrderNotes } from "@/lib/orders/workflows";
import { z } from "zod";
import { query } from "@/lib/database/index";

const schema = z.object({
  notas_internas: z.string().max(2000).optional(),
  fecha_estimada_entrega: z.string().optional().nullable(),
});

export async function POST(req: NextRequest, { params: paramsP }: { params: Promise<{ id: string }> }) {
  await initStore();
  const params = await paramsP;
  const auth = await guardStaff("orders.update_status");
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Datos inválidos.", 400);

  const order = query((db) => db.service_orders.find((o) => o.id === params.id && o.workshop_id === auth.workshopId)) ?? null;
  if (!order) return fail("Orden no encontrada en este taller.", 404);
  if (auth.session.rol === "mechanic" && order.responsable_id !== auth.session.user_id) {
    return fail("Solo puedes editar notas de órdenes asignadas a ti.", 403);
  }

  if (parsed.data.notas_internas !== undefined) {
    const r = updateOrderNotes(params.id, parsed.data.notas_internas, auth.actor, auth.workshopId);
    if (!r.ok) return fail(r.error ?? "No se pudo actualizar.", 400);
  }
  if (parsed.data.fecha_estimada_entrega !== undefined) {
    const fecha = parsed.data.fecha_estimada_entrega ? new Date(parsed.data.fecha_estimada_entrega).toISOString() : null;
    const r = updateEstimatedDate(params.id, fecha, auth.actor, auth.workshopId);
    if (!r.ok) return fail(r.error ?? "No se pudo actualizar.", 400);
  }
  return okJson({ id: params.id });
}
