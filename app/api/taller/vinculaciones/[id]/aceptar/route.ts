import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { aceptarVinculacion } from "@/lib/database/queries";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initStore();
  const auth = await guardStaff("customers.manage");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const res = aceptarVinculacion(id, auth.workshopId, auth.actor.id, auth.actor.nombre);
  if (!res.ok) return fail(res.error ?? "No se pudo aceptar la vinculacion.", 400);
  await flushStore();
  return okJson({ ok: true });
}
