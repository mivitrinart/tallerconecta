import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardCustomerToken, fail, okJson } from "@/lib/auth/guards";
import { decisionSchema } from "@/lib/validations/schemas";
import { recordDecision } from "@/lib/orders/workflows";

/**
 * Decisión del cliente desde el portal: aprobar/rechazar cada trabajo.
 * Queda registrada la fecha, el usuario y la versión autorizada.
 */
export async function POST(req: NextRequest, { params: paramsP }: { params: Promise<{ id: string }> }) {
  await initStore();
  const params = await paramsP;
  const body = await req.json().catch(() => null);
  const auth = guardCustomerToken(body?.token);
  if (!auth.ok) return auth.response;

  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);

  const resultado = recordDecision(params.id, parsed.data.decisiones, parsed.data.comentario, auth.customer, auth.workshopId);
  if (!resultado.ok) return fail(resultado.error ?? "No se pudo registrar la decisión.", 400);
  await flushStore();
  return okJson({ id: params.id });
}
