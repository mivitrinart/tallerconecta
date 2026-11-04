import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardCustomerToken, fail, okJson } from "@/lib/auth/guards";
import { markThreadRead, markNotificationsRead } from "@/lib/orders/workflows";
import { z } from "zod";
import { query } from "@/lib/database/index";

const schema = z.object({
  token: z.string().min(1),
  order_id: z.string().min(1).optional(),
});

/** Marca como leídos los mensajes y notificaciones del cliente. */
export async function POST(req: NextRequest) {
  await initStore();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Datos inválidos.", 400);

  const auth = guardCustomerToken(parsed.data.token);
  if (!auth.ok) return auth.response;

  if (parsed.data.order_id) {
    const pertenece = query(
      (db) =>
        db.service_orders.some(
          (o) => o.id === parsed.data.order_id && o.customer_id === auth.customer.id && o.workshop_id === auth.workshopId
        ) ?? false
    );
    if (!pertenece) return fail("Orden no encontrada.", 404);
    markThreadRead(parsed.data.order_id, "customer", auth.workshopId);
  }
  markNotificationsRead("customer", auth.customer.id);
  return okJson();
}
