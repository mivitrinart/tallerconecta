import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardCustomerAccount, fail, okJson } from "@/lib/auth/guards";
import { cuentaVehicleUpdateSchema } from "@/lib/validations/schemas";
import { customerUpdateVehicle } from "@/lib/orders/workflows";

export async function PATCH(req: NextRequest, { params: paramsP }: { params: Promise<{ id: string }> }) {
  await initStore();
  const { id } = await paramsP;
  const auth = await guardCustomerAccount();
  if (!auth.ok) return auth.response;
  const parsed = cuentaVehicleUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);
  const res = customerUpdateVehicle(auth.account.id, id, parsed.data);
  if (!res.ok) return fail(res.error ?? "No se pudo actualizar el vehículo.", 400);
  return okJson({ id: res.id });
}
