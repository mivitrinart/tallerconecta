import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { z } from "zod";
import { guardAdmin, fail, okJson } from "@/lib/auth/guards";
import { adminUpdateUserEstado } from "@/lib/orders/workflows";

const schema = z.object({ estado: z.enum(["activo", "inactivo"]) });

export async function PATCH(req: NextRequest, { params: paramsP }: { params: Promise<{ id: string }> }) {
  await initStore();
  const { id } = await paramsP;
  const auth = await guardAdmin();
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Estado inválido.", 400);
  const res = adminUpdateUserEstado(id, parsed.data.estado, auth.actor);
  if (!res.ok) return fail(res.error ?? "No se pudo actualizar.", 400);
  return okJson({ id });
}
