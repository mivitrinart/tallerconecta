import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { sendEstimate } from "@/lib/orders/workflows";

export async function POST(_req: NextRequest, { params: paramsP }: { params: Promise<{ id: string }> }) {
  await initStore();
  const { id } = await paramsP;
  const auth = await guardStaff("estimates.manage");
  if (!auth.ok) return auth.response;
  const res = sendEstimate(id, auth.actor, auth.workshopId);
  if (!res.ok) return fail(res.error ?? "No se pudo enviar.", 400);
  return okJson({ id });
}
