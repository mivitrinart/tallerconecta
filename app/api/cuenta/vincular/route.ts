import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardCustomerAccount, fail, okJson } from "@/lib/auth/guards";
import { linkTokenSchema } from "@/lib/validations/schemas";
import { linkCustomerByToken } from "@/lib/orders/workflows";

export async function POST(req: NextRequest) {
  await initStore();
  const auth = await guardCustomerAccount();
  if (!auth.ok) return auth.response;
  const parsed = linkTokenSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Enlace inválido.", 400);
  const raw = parsed.data.token.trim();
  const token = raw.includes("/seguimiento/") ? raw.split("/seguimiento/").pop()!.split(/[?#]/)[0] : raw;
  const res = linkCustomerByToken(auth.account.id, token);
  if (!res.ok) return fail(res.error ?? "No se pudo vincular.", 400);
  await flushStore();
  return okJson({ id: res.id, pendiente: (res as { pendiente?: boolean }).pendiente ?? true });
}
