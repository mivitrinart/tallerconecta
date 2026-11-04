import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { orderCreateSchema } from "@/lib/validations/schemas";
import { createOrder } from "@/lib/orders/workflows";

export async function POST(req: NextRequest) {
  await initStore();
  const auth = await guardStaff("orders.create");
  if (!auth.ok) return auth.response;
  const parsed = orderCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);
  try {
    const order = createOrder(parsed.data, auth.workshopId, auth.actor);
    await flushStore();
    return okJson({ id: order.id, numero: order.numero, redirect: `/taller/ordenes/${order.id}` });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "No se pudo crear la orden.", 400);
  }
}
