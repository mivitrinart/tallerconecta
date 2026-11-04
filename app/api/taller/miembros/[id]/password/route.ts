import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { memberPasswordSchema } from "@/lib/validations/schemas";
import { resetMemberPassword } from "@/lib/orders/workflows";

/** El propietario genera/define una nueva contraseña para un miembro. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initStore();
  const { id } = await params;
  const auth = await guardStaff("members.manage");
  if (!auth.ok) return auth.response;

  const parsed = memberPasswordSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);

  const resultado = resetMemberPassword(auth.workshopId, id, auth.actor, parsed.data.password || undefined);
  if (!resultado.ok) return fail(resultado.error ?? "No se pudo generar la contraseña.", 400);
  return okJson({ id, password_temporal: resultado.passwordTemporal });
}
