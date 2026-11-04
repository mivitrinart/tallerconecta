import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { statusChangeSchema } from "@/lib/validations/schemas";
import { changeOrderStatus } from "@/lib/orders/workflows";
import { query } from "@/lib/database/index";
import { AVANCES_MECANICO, puede } from "@/lib/permissions";

/**
 * Cambio de estado de una orden con todas las guardas:
 * - Máquina de estados (transiciones permitidas).
 * - Regla fundamental: no pasar a reparación con autorización pendiente.
 * - Cancelar exige motivo.
 * - Los mecánicos solo pueden actualizar avances de trabajos asignados.
 */
export async function POST(req: NextRequest, { params: paramsP }: { params: Promise<{ id: string }> }) {
  await initStore();
  const params = await paramsP;
  const auth = await guardStaff();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = statusChangeSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);

  const { estado, motivo, nota } = parsed.data;

  const order = query((db) =>
    db.service_orders.find((o) => o.id === params.id && o.workshop_id === auth.workshopId) ?? null
  );
  if (!order) return fail("Orden no encontrada en este taller.", 404);

  if (auth.session.rol === "mechanic") {
    // El mecánico consulta trabajos asignados y actualiza avances (y nada más)
    if (!puede("mechanic", "orders.update_progress")) return fail("Sin permiso.", 403);
    if (order.responsable_id !== auth.session.user_id) {
      return fail("Solo puedes actualizar los trabajos que tienes asignados.", 403);
    }
    const permitidos = AVANCES_MECANICO[order.estado] ?? [];
    if (!permitidos.includes(estado)) {
      return fail("Ese cambio de estado corresponde al asesor o al propietario del taller.", 403);
    }
  } else if (!puede(auth.session.rol, "orders.update_status")) {
    return fail("Tu rol no puede cambiar estados.", 403);
  }

  const resultado = changeOrderStatus(order.id, estado, auth.actor, auth.workshopId, { motivo, nota });
  if (!resultado.ok) return fail(resultado.error ?? "No se pudo cambiar el estado.", 400);
  await flushStore();
  return okJson({ id: order.id, estado });
}
