import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardCustomerAccount, fail, okJson } from "@/lib/auth/guards";
import { unlinkSchema } from "@/lib/validations/schemas";
import { unlinkCustomer } from "@/lib/orders/workflows";

export async function POST(req: NextRequest) {
  await initStore();
  const auth = await guardCustomerAccount();
  if (!auth.ok) return auth.response;
  const parsed = unlinkSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);
  const res = unlinkCustomer(auth.account.id, parsed.data.customer_id);
  if (!res.ok) return fail(res.error ?? "No se pudo desvincular.", 400);
  await flushStore();
  return okJson({ id: res.id });
}
