import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { vehicleSchema } from "@/lib/validations/schemas";
import { createVehicle } from "@/lib/orders/workflows";
import { query } from "@/lib/database/index";

export async function POST(req: NextRequest) {
  await initStore();
  const auth = await guardStaff("vehicles.manage");
  if (!auth.ok) return auth.response;

  const parsed = vehicleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Revisa los datos del vehículo.", 400);
  if (!parsed.data.customer_id) return fail("Debes indicar el propietario del vehículo.", 400);

  // Aislamiento por taller: el cliente debe pertenecer al taller de la sesión
  const clienteOk = query(
    (db) => db.customers.some((c) => c.id === parsed.data.customer_id && c.workshop_id === auth.workshopId)
  );
  if (!clienteOk) return fail("El cliente no pertenece a este taller.", 403);

  const vehicle = createVehicle(parsed.data, auth.workshopId, auth.actor);
  await flushStore();
  return okJson({ id: vehicle.id });
}
