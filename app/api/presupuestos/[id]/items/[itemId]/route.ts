import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { criticidadSchema } from "@/lib/validations/schemas";
import { setItemCriticidad } from "@/lib/orders/workflows";

export async function PATCH(req: NextRequest, { params: paramsP }: { params: Promise<{ id: string; itemId: string }> }) {
  await initStore();
  const { id, itemId } = await paramsP;
  const auth = await guardStaff("estimates.manage");
  if (!auth.ok) return auth.response;
  const parsed = criticidadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Criticidad inválida.", 400);
  const res = setItemCriticidad(id, itemId, parsed.data.criticidad, auth.actor, auth.workshopId);
  if (!res.ok) return fail(res.error ?? "No se pudo guardar.", 400);
  return okJson({ id: itemId });
}
