import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { customerSchema } from "@/lib/validations/schemas";
import { createCustomer } from "@/lib/orders/workflows";

export async function POST(req: NextRequest) {
  await initStore();
  const auth = await guardStaff("customers.manage");
  if (!auth.ok) return auth.response;
  const parsed = customerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);
  const customer = createCustomer(parsed.data, auth.workshopId, auth.actor);
  await flushStore();
  return okJson({ id: customer.id, portal: `/seguimiento/${customer.portal_token}` });
}
