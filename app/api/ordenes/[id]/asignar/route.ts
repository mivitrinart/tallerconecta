import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { assignSchema } from "@/lib/validations/schemas";
import { assignResponsable } from "@/lib/orders/workflows";

export async function POST(req: NextRequest, { params: paramsP }: { params: Promise<{ id: string }> }) {
  await initStore();
  const { id } = await paramsP;
  const auth = await guardStaff("orders.assign");
  if (!auth.ok) return auth.response;
  const parsed = assignSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);
  const res = assignResponsable(id, parsed.data.responsable_id, auth.actor, auth.workshopId);
  if (!res.ok) return fail(res.error ?? "No se pudo asignar.", 400);
  return okJson({ id });
}
