import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardCustomerToken, fail, okJson } from "@/lib/auth/guards";
import { ratingSchema } from "@/lib/validations/schemas";
import { rateOrder } from "@/lib/orders/workflows";
import { z } from "zod";
import { query } from "@/lib/database/index";

const schema = ratingSchema.extend({
  token: z.string().min(1),
  order_id: z.string().min(1),
});

/** Calificación del servicio tras la entrega (flujo paso 6). */
export async function POST(req: NextRequest) {
  await initStore();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);

  const auth = guardCustomerToken(parsed.data.token);
  if (!auth.ok) return auth.response;

  const pertenece = query(
    (db) =>
      db.service_orders.some(
        (o) => o.id === parsed.data.order_id && o.customer_id === auth.customer.id && o.workshop_id === auth.workshopId
      ) ?? false
  );
  if (!pertenece) return fail("Orden no encontrada.", 404);

  const resultado = rateOrder(parsed.data.order_id, parsed.data.calificacion, parsed.data.comentario, auth.customer, auth.workshopId);
  if (!resultado.ok) return fail(resultado.error ?? "No se pudo registrar la calificación.", 400);
  return okJson({ id: parsed.data.order_id });
}
