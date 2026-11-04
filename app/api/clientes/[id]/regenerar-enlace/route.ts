import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { regenerateCustomerPortalLink } from "@/lib/orders/workflows";

export async function POST(_req: NextRequest, { params: paramsP }: { params: Promise<{ id: string }> }) {
  await initStore();
  const { id } = await paramsP;
  const auth = await guardStaff("customers.manage");
  if (!auth.ok) return auth.response;
  const res = regenerateCustomerPortalLink(id, auth.workshopId, auth.actor);
  if (!res.ok) return fail(res.error ?? "No se pudo regenerar el enlace.", 400);
  return okJson({ id: res.id });
}
