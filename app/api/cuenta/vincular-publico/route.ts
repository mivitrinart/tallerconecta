import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardCustomerAccount, fail, okJson } from "@/lib/auth/guards";
import { query, mutate, nowISO, uid } from "@/lib/database/index";
import type { Customer } from "@/lib/database/types";
import { notifyStaffGestion, notifyCustomerLinkSent } from "@/lib/notify";
import { registrarIntento, obtenerIp, validarOrigin } from "@/lib/auth/rate-limit";

/** Vincula la cuenta del cliente a un taller usando su enlace público de inscripción.
 *
 * SEGURIDAD: no existe auto-vinculación por coincidencia de correo (el correo no
 * está verificado al registrarse). Solo se crea una solicitud PENDIENTE que el
 * taller debe aceptar. Se crea una ficha de customer para que el taller sepa
 * quién solicita la vinculación.
 */
export async function POST(req: NextRequest) {
  await initStore();
  const ip = obtenerIp(req);
  const ruta = "/api/cuenta/vincular-publico";
  const limite = registrarIntento(ip, ruta);
  if (!limite.permitido) {
    return fail("Demasiados intentos. Intenta de nuevo más tarde.", 429);
  }
  if (!validarOrigin(req, req.nextUrl.host)) {
    return fail("Origen no permitido.", 403);
  }

  const auth = await guardCustomerAccount();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const enlacePublico = typeof body?.enlace_publico === "string" ? body.enlace_publico.trim() : "";
  if (!enlacePublico) {
    return fail("Enlace público del taller requerido.", 400);
  }

  const workshop = query((db) => db.workshops.find((w) => w.enlace_publico === enlacePublico));
  if (!workshop) {
    return fail("Enlace público inválido o no encontrado.", 404);
  }

  const account = auth.account;

  const result = mutate((db) => {
    // Si ya existe un link pendiente o aceptado para esta cuenta y taller, bloquear duplicados.
    const existenteLink = db.customer_account_links.find(
      (l) => l.account_id === account.id && l.workshop_id === workshop.id && l.estado !== "rechazado"
    );
    if (existenteLink) {
      if (existenteLink.estado === "pendiente") {
        return { ok: false as const, error: "Ya tienes una solicitud de vinculación pendiente para este taller.", status: 409 };
      }
      return { ok: false as const, error: "Esta cuenta ya está vinculada a este taller.", status: 409 };
    }

    // Crear una ficha de customer para este cliente en este taller, para que el
    // taller sepa quién solicita la vinculación y pueda ver sus vehículos/órdenes.
    const customer: Customer = {
      id: uid("cust"),
      workshop_id: workshop.id,
      nombre: account.nombre,
      telefono: account.telefono,
      correo: account.correo,
      portal_token: uid("tok_pub"),
      consentimiento_datos_at: account.consentimiento_datos_at ?? nowISO(),
      consentimiento_origen: "vinculacion_cuenta",
      anonimizado: false,
      portal_activo: true,
      created_at: nowISO(),
    };
    db.customers.push(customer);

    db.customer_account_links.push({
      id: uid("lnk"),
      account_id: account.id,
      customer_id: customer.id,
      workshop_id: workshop.id,
      origen: "public",
      estado: "pendiente",
      created_at: nowISO(),
    });

    db.audit_logs.push({
      id: uid("aud"),
      workshop_id: workshop.id,
      actor_id: account.id,
      actor_nombre: account.nombre,
      accion: "cuenta_cliente.vincular_publico",
      entidad: "customer_account_links",
      entidad_id: customer.id,
      detalle: { origen: "public", estado: "pendiente", taller: workshop.nombre, customer_id: customer.id },
      created_at: nowISO(),
    });

    // Notificar al personal activo del taller que hay una solicitud de vinculación pendiente.
    notifyStaffGestion(
      db,
      workshop.id,
      "vinculacion_solicitada",
      `Nueva solicitud de vinculación · ${account.nombre}`,
      `${account.nombre} (${account.correo}) solicitó vincular su ficha a tu taller (${workshop.nombre}).`,
      null,
      `/taller/vinculaciones`,
    );

    // Notificar al cliente que su solicitud fue enviada (para que aparezca en su panel).
    notifyCustomerLinkSent(
      db,
      workshop.id,
      customer.id,
      workshop.nombre,
      account.nombre,
      `/seguimiento/${customer.portal_token}`,
    );

    return { ok: true as const };
  });

  if (!result.ok) return fail(result.error, result.status ?? 400);
  await flushStore();
  return okJson({ pendiente: true });
}
