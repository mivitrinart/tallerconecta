import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { usuarioPerfilSchema } from "@/lib/validations/schemas";
import { updateUserProfile } from "@/lib/orders/workflows";

export async function PATCH(req: NextRequest) {
  await initStore();
  const auth = await guardStaff("settings.manage");
  if (!auth.ok) return auth.response;

  const parsed = usuarioPerfilSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);

  const resultado = updateUserProfile(auth.session.user_id, parsed.data);
  if (!resultado.ok) return fail(resultado.error ?? "No se pudo actualizar.", 400);
  return okJson({ id: auth.session.user_id });
}
