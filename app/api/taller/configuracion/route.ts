import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { workshopUpdateSchema } from "@/lib/validations/schemas";
import { updateWorkshopProfile } from "@/lib/orders/workflows";

export async function PATCH(req: NextRequest) {
  await initStore();
  const auth = await guardStaff("settings.manage");
  if (!auth.ok) return auth.response;
  const parsed = workshopUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);
  const res = updateWorkshopProfile(auth.workshopId, parsed.data, auth.actor);
  if (!res.ok) return fail(res.error ?? "No se pudo actualizar.", 400);
  await flushStore();
  return okJson({ id: auth.workshopId });
}
