import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { deliverSchema } from "@/lib/validations/schemas";
import { deliverOrder } from "@/lib/orders/workflows";

export async function POST(req: NextRequest, { params: paramsP }: { params: Promise<{ id: string }> }) {
  await initStore();
  const { id } = await paramsP;
  const auth = await guardStaff("orders.deliver");
  if (!auth.ok) return auth.response;
  const parsed = deliverSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);
  const res = deliverOrder(id, parsed.data.valor_final, auth.actor, auth.workshopId, parsed.data.nota);
  if (!res.ok) return fail(res.error ?? "No se pudo entregar.", 400);
  await flushStore();
  return okJson({ id });
}
