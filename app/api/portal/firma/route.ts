import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardCustomerToken, fail, okJson } from "@/lib/auth/guards";
import { firmaSchema } from "@/lib/validations/schemas";
import { signDeliveryConformity } from "@/lib/orders/workflows";

export async function POST(req: NextRequest) {
  await initStore();
  const body = await req.json().catch(() => null);
  const parsed = firmaSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Firma inválida.", 400);
  const auth = guardCustomerToken(parsed.data.token);
  if (!auth.ok) return auth.response;
  const res = signDeliveryConformity(parsed.data.order_id, parsed.data.firma, auth.customer, auth.workshopId);
  if (!res.ok) return fail(res.error ?? "No se pudo registrar la firma.", 400);
  return okJson({ id: res.id });
}
