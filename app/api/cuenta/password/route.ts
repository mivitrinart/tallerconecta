import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardCustomerAccount, fail, okJson } from "@/lib/auth/guards";
import { z } from "zod";
import { updateCustomerAccountPassword, verifyCustomerPassword } from "@/lib/orders/workflows";

const changePasswordSchema = z.object({
  passwordActual: z.string().min(1, "Contraseña actual requerida"),
  passwordNueva: z.string().min(8, "Mínimo 8 caracteres"),
  passwordConfirmar: z.string().min(8),
}).refine((data) => data.passwordNueva === data.passwordConfirmar, {
  message: "Las contraseñas no coinciden",
  path: ["passwordConfirmar"],
});

export async function PATCH(req: NextRequest) {
  await initStore();
  const auth = await guardCustomerAccount();
  if (!auth.ok) return auth.response;

  const parsed = changePasswordSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);

  // Verificar contraseña actual
  const passwordOk = await verifyCustomerPassword(auth.account.id, parsed.data.passwordActual);
  if (!passwordOk) return fail("La contraseña actual es incorrecta.", 401);

  // Actualizar contraseña
  const res = updateCustomerAccountPassword(auth.account.id, parsed.data.passwordNueva);
  if (!res.ok) return fail(res.error ?? "No se pudo actualizar la contraseña.", 400);

  return okJson({ id: res.id });
}