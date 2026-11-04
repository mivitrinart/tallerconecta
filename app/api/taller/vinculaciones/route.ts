import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { listVinculacionesPendientes } from "@/lib/database/queries";

export async function GET(_req: NextRequest) {
  await initStore();
  const auth = await guardStaff("customers.manage");
  if (!auth.ok) return auth.response;
  const pendientes = listVinculacionesPendientes(auth.workshopId);
  return okJson({ vinculaciones: pendientes });
}
