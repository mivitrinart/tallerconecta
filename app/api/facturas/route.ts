import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { invoiceCreateSchema } from "@/lib/validations/schemas";
import { createInvoice } from "@/lib/orders/workflows";
import { listInvoices } from "@/lib/database/queries";

/** POST: crea una factura electrónica desde un presupuesto autorizado. */
export async function POST(req: NextRequest) {
  await initStore();
  const auth = await guardStaff("estimates.manage");
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = invoiceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Datos de factura inválidos.", 400);
  }

  const resultado = createInvoice(parsed.data, auth.actor, auth.workshopId);
  if (!resultado.ok) return fail(resultado.error ?? "No se pudo crear la factura.", 400);
  return okJson(resultado.invoice as unknown as Record<string, unknown>);
}

/** GET: lista facturas del taller. */
export async function GET(req: NextRequest) {
  await initStore();
  const auth = await guardStaff("estimates.manage");
  if (!auth.ok) return auth.response;

  const invoices = listInvoices(auth.workshopId);
  return okJson({ invoices });
}
