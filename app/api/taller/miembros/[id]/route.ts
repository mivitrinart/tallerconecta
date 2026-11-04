import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { memberRoleSchema } from "@/lib/validations/schemas";
import { updateMemberRole } from "@/lib/orders/workflows";

export async function PATCH(req: NextRequest, { params: paramsP }: { params: Promise<{ id: string }> }) {
  await initStore();
  const { id } = await paramsP;
  const auth = await guardStaff("members.manage");
  if (!auth.ok) return auth.response;
  const parsed = memberRoleSchema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);
  const res = updateMemberRole(auth.workshopId, id, parsed.data, auth.actor);
  if (!res.ok) return fail(res.error ?? "No se pudo actualizar.", 400);
  return okJson({ id });
}
