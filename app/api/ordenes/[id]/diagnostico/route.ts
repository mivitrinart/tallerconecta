import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { diagnosticSchema } from "@/lib/validations/schemas";
import { saveDiagnostic } from "@/lib/orders/workflows";
import { query } from "@/lib/database/index";

export async function POST(req: NextRequest, { params: paramsP }: { params: Promise<{ id: string }> }) {
  await initStore();
  const params = await paramsP;
  const auth = await guardStaff("diagnostics.write");
  if (!auth.ok) return auth.response;

  const parsed = diagnosticSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);

  const order = query((db) => db.service_orders.find((o) => o.id === params.id && o.workshop_id === auth.workshopId)) ?? null;
  if (!order) return fail("Orden no encontrada en este taller.", 404);
  if (auth.session.rol === "mechanic" && order.responsable_id !== auth.session.user_id) {
    return fail("Solo puedes editar diagnósticos de órdenes asignadas a ti.", 403);
  }

  const resultado = saveDiagnostic(params.id, parsed.data.descripcion, parsed.data.recomendaciones, auth.actor, auth.workshopId);
  if (!resultado.ok) return fail(resultado.error ?? "No se pudo registrar el diagnóstico.", 400);
  await flushStore();
  return okJson({ id: params.id });
}
