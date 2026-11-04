import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { estimateCreateSchema } from "@/lib/validations/schemas";
import { createEstimateDraft } from "@/lib/orders/workflows";

export async function POST(req: NextRequest) {
  await initStore();
  const auth = await guardStaff("estimates.manage");
  if (!auth.ok) return auth.response;
  const parsed = estimateCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);
  try {
    const est = createEstimateDraft(parsed.data, auth.actor, auth.workshopId);
    await flushStore();
    return okJson({ id: est.id, version: est.version, total: est.total });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "No se pudo crear el presupuesto.", 400);
  }
}
