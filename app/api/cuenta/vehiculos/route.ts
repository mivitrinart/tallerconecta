import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardCustomerAccount, fail, okJson } from "@/lib/auth/guards";
import { cuentaVehicleSchema } from "@/lib/validations/schemas";
import { customerAddVehicle } from "@/lib/orders/workflows";

export async function POST(req: NextRequest) {
  await initStore();
  const auth = await guardCustomerAccount();
  if (!auth.ok) return auth.response;
  const parsed = cuentaVehicleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);
  const res = customerAddVehicle(auth.account.id, parsed.data);
  if (!res.ok) return fail(res.error ?? "No se pudo registrar el vehículo.", 400);
  return okJson({ id: res.id });
}
