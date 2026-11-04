import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, okJson } from "@/lib/auth/guards";
import { markThreadRead } from "@/lib/orders/workflows";

export async function POST(_req: NextRequest, { params: paramsP }: { params: Promise<{ id: string }> }) {
  await initStore();
  const { id } = await paramsP;
  const auth = await guardStaff();
  if (!auth.ok) return auth.response;
  markThreadRead(id, "staff", auth.workshopId);
  return okJson();
}
