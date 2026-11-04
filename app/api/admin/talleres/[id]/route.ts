import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardAdmin, fail, okJson } from "@/lib/auth/guards";
import { adminWorkshopSchema } from "@/lib/validations/schemas";
import { adminUpdateWorkshop } from "@/lib/orders/workflows";

export async function PATCH(req: NextRequest, { params: paramsP }: { params: Promise<{ id: string }> }) {
  await initStore();
  const { id } = await paramsP;
  const auth = await guardAdmin();
  if (!auth.ok) return auth.response;
  const parsed = adminWorkshopSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);
  const res = adminUpdateWorkshop(id, parsed.data, auth.actor);
  if (!res.ok) return fail(res.error ?? "No se pudo actualizar.", 400);
  return okJson({ id });
}
