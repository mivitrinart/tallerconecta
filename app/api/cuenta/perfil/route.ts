import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardCustomerAccount, fail, okJson } from "@/lib/auth/guards";
import { accountProfileSchema } from "@/lib/validations/schemas";
import { updateCustomerAccountProfile } from "@/lib/orders/workflows";

export async function PATCH(req: NextRequest) {
  await initStore();
  const auth = await guardCustomerAccount();
  if (!auth.ok) return auth.response;
  const parsed = accountProfileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);
  const res = updateCustomerAccountProfile(auth.account.id, parsed.data);
  if (!res.ok) return fail(res.error ?? "No se pudo actualizar.", 400);
  return okJson({ id: res.id });
}
