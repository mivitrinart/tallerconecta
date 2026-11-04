import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { reminderSchema } from "@/lib/validations/schemas";
import { sendMaintenanceReminder } from "@/lib/orders/workflows";

export async function POST(req: NextRequest) {
  await initStore();
  const auth = await guardStaff("customers.manage");
  if (!auth.ok) return auth.response;
  const parsed = reminderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);
  const res = sendMaintenanceReminder(parsed.data.vehicle_id, auth.workshopId, auth.actor);
  if (!res.ok) return fail(res.error ?? "No se pudo enviar el recordatorio.", 400);
  return okJson({ id: res.id });
}
