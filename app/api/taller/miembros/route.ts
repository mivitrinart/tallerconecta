import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { memberInviteSchema } from "@/lib/validations/schemas";
import { inviteMember } from "@/lib/orders/workflows";

export async function POST(req: NextRequest) {
  await initStore();
  const auth = await guardStaff("members.manage");
  if (!auth.ok) return auth.response;
  const parsed = memberInviteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);
  const res = inviteMember(auth.workshopId, { ...parsed.data, password: parsed.data.password || undefined }, auth.actor);
  if (!res.ok) return fail(res.error ?? "No se pudo añadir el miembro.", 400);
  await flushStore();
  return okJson({
    id: res.id,
    member_id: res.memberId,
    password_temporal: res.passwordTemporal ?? null,
    ya_existe: Boolean(res.yaExiste),
  });
}
