import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardCustomerToken, fail, okJson } from "@/lib/auth/guards";
import { resumenSchema } from "@/lib/validations/schemas";
import { requestWhatsappSummary } from "@/lib/orders/workflows";

export async function POST(req: NextRequest) {
  await initStore();
  const body = await req.json().catch(() => null);
  const parsed = resumenSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);
  const auth = guardCustomerToken(parsed.data.token);
  if (!auth.ok) return auth.response;
  const res = requestWhatsappSummary(parsed.data.order_id, auth.customer, auth.workshopId);
  if (!res.ok) return fail(res.error ?? "No se pudo generar el resumen.", 400);
  return okJson({ resumen: res.resumen, whatsapp_url: res.whatsappUrl });
}
