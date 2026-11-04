import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardCustomerAccount, fail, okJson } from "@/lib/auth/guards";
import { mutate, nowISO, uid } from "@/lib/database/index";

/** Cancela una solicitud de vinculación pendiente del cliente hacia un taller. */
export async function POST(req: NextRequest) {
  await initStore();
  const auth = await guardCustomerAccount();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const workshopId = typeof body?.workshop_id === "string" ? body.workshop_id.trim() : "";
  if (!workshopId) {
    return fail("ID del taller requerido.", 400);
  }

  const res = mutate((db) => {
    const link = db.customer_account_links.find(
      (l) => l.account_id === auth.account.id && l.workshop_id === workshopId && l.estado === "pendiente"
    );
    if (!link) {
      return { ok: false as const, error: "No hay una solicitud de vinculación pendiente para este taller." };
    }

    db.customer_account_links = db.customer_account_links.filter(
      (l) => l.id !== link.id
    );

    // Si la solicitud creó una ficha temporal (origen "public") sin órdenes ni vehículos,
    // limpiarla para no dejar fichas huérfanas en el taller.
    if (link.origen === "public") {
      const tieneOrdenes = db.service_orders.some((o) => o.customer_id === link.customer_id);
      const tieneVehiculos = db.vehicles.some((v) => v.customer_id === link.customer_id);
      if (!tieneOrdenes && !tieneVehiculos) {
        db.customers = db.customers.filter((c) => c.id !== link.customer_id);
      }
    }

    db.audit_logs.push({
      id: uid("aud"),
      workshop_id: workshopId,
      actor_id: auth.account.id,
      actor_nombre: auth.account.nombre,
      accion: "cuenta_cliente.cancelar_vinculacion",
      entidad: "customer_account_links",
      entidad_id: link.customer_id,
      detalle: { origen: link.origen, taller: link.workshop_id },
      created_at: nowISO(),
    });

    return { ok: true as const };
  });

  if (!res.ok) return fail(res.error, 404);
  await flushStore();
  return okJson({ ok: true });
}
