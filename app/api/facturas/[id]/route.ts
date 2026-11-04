import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardStaff, fail, okJson } from "@/lib/auth/guards";
import { mutate } from "@/lib/database/index";
import { nowISO, uid } from "@/lib/database/index";
import type { Invoice, EstadoFactura } from "@/lib/database/types";
import { notify } from "@/lib/notify";
import { formatCOP } from "@/lib/format";
import { findOrder } from "@/lib/orders/workflows";

/** PATCH /api/facturas/[id]/anular - anula una factura emitida. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initStore();
  const auth = await guardStaff("estimates.manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body: { action?: string } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    body = {};
  }
  const { action } = body;

  if (action !== "anular" && action !== "pagar") {
    return fail("Acción inválida. Usa 'anular' o 'pagar'.", 400);
  }

  if (!auth.workshopId) {
    return fail("Taller no asociado a la sesión.", 403);
  }

  const resultado = mutate((db) => {
    const invoice = db.invoices.find((i) => i.id === id && i.workshop_id === auth.workshopId);
    if (!invoice) {
      return { ok: false, error: "Factura no encontrada en este taller." };
    }
    if (invoice.estado === "anulada") {
      return { ok: false, error: "Esta factura ya está anulada." };
    }
    if (invoice.estado === "pagada" && action === "anular") {
      return { ok: false, error: "No se puede anular una factura ya pagada." };
    }

    const prevEstado = invoice.estado;
    invoice.estado = action === "anular" ? "anulada" : "pagada";
    if (action === "anular") invoice.anulada_at = nowISO();
    if (action === "pagar") invoice.pagada_at = nowISO();

    const order = findOrder(db, invoice.service_order_id, auth.workshopId);
    if (order) {
      const actor = { id: auth.actor.id, nombre: auth.actor.nombre };
      const tipoFactura = action === "anular" ? "anulada" : "pagada";
      const ordenes = db.order_events; // noop para evitar unused
      db.order_events.push({
        id: uid("evt"),
        service_order_id: invoice.service_order_id,
        workshop_id: invoice.workshop_id,
        tipo: "nota",
        estado_anterior: null,
        estado_nuevo: null,
        descripcion: `Factura ${invoice.numero} ${tipoFactura} · Total ${formatCOP(invoice.total)}`,
        actor_id: actor.id,
        actor_nombre: actor.nombre,
        created_at: nowISO(),
      });
    }

    pushAudit(db, auth.workshopId, auth.actor, `factura.${action}`, "invoices", invoice.id, {
      numero: invoice.numero,
      estado_anterior: prevEstado,
      estado_nuevo: invoice.estado,
      total: invoice.total,
    });

    if (order) {
      const customer = db.customers.find((c) => c.id === order.customer_id);
      if (customer) {
        notify({
          db,
          workshopId: auth.workshopId,
          destinatarioTipo: "customer",
          destinatarioId: customer.id,
          tipo: `factura_${action}`,
          titulo: `Factura ${invoice.numero} ${action === "anular" ? "anulada" : "pagada"}`,
          cuerpo: `La factura ${invoice.numero} por ${formatCOP(invoice.total)} ha sido ${action === "anular" ? "anulada" : "marcada como pagada"}.`,
          link: `/seguimiento/${customer.portal_token}`,
          serviceOrderId: order.id,
        });
      }
    }

    return { ok: true, id: invoice.id };
  });

  if (!resultado.ok) return fail(resultado.error ?? "Error desconocido", 400);
  return okJson({ id: resultado.id });
}

function pushAudit(
  db: any,
  workshopId: string | null,
  actor: { id: string; nombre: string },
  accion: string,
  entidad: string,
  entidadId: string | null,
  detalle?: Record<string, unknown>
) {
  db.audit_logs.push({
    id: uid("aud"),
    workshop_id: workshopId,
    actor_id: actor.id,
    actor_nombre: actor.nombre,
    accion,
    entidad,
    entidad_id: entidadId,
    detalle: detalle ?? null,
    created_at: nowISO(),
  });
}
