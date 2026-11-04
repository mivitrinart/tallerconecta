import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardCustomerToken, fail, okJson } from "@/lib/auth/guards";
import { messageSchema } from "@/lib/validations/schemas";
import { sendMessage } from "@/lib/orders/workflows";
import { z } from "zod";
import { query } from "@/lib/database/index";

const schema = messageSchema.extend({
  token: z.string().min(1),
  order_id: z.string().min(1),
});

/** Pregunta del cliente al taller desde el portal. */
export async function POST(req: NextRequest) {
  await initStore();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Mensaje inválido.", 400);

  const auth = guardCustomerToken(parsed.data.token);
  if (!auth.ok) return auth.response;

  // La orden debe pertenecer al cliente del token (aislamiento total)
  const pertenece = query(
    (db) =>
      db.service_orders.some(
        (o) => o.id === parsed.data.order_id && o.customer_id === auth.customer.id && o.workshop_id === auth.workshopId
      ) ?? false
  );
  if (!pertenece) return fail("Orden no encontrada.", 404);

  const msg = sendMessage(
    parsed.data.order_id,
    "customer",
    auth.customer.id,
    auth.customer.nombre,
    parsed.data.contenido,
    auth.workshopId
  );
  if (!msg) return fail("No se pudo enviar el mensaje.", 400);
  return okJson({ id: msg.id });
}
