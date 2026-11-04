/**
 * Módulo 6 · Notificaciones y atención.
 *
 * Regla fundamental del documento: una notificación NUNCA afirma que algo
 * sucedió si el taller no actualizó el estado. Por eso las notificaciones
 * solo se generan desde los workflows (lib/orders/workflows.ts), disparadas
 * por cambios reales en la base de datos.
 *
 * En modo demo los canales email/WhatsApp quedan registrados en una
 * "bandeja de salida simulada" (visible en Configuración → Comunicaciones).
 */
import type { CanalNotificacion, Database, Notification } from "@/lib/database/types";
import { nowISO, uid } from "@/lib/database/index";
import { sanitizeTexto } from "@/lib/format";

interface NotifyInput {
  db: Database;
  workshopId: string | null;
  destinatarioTipo: "user" | "customer";
  destinatarioId: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  /** Canales deseados. El cliente recibe in_app + los externos simulados. */
  canales?: CanalNotificacion[];
  link?: string | null;
  serviceOrderId?: string | null;
}

export function notify({
  db,
  workshopId,
  destinatarioTipo,
  destinatarioId,
  tipo,
  titulo,
  cuerpo,
  canales,
  link = null,
  serviceOrderId = null,
}: NotifyInput): Notification[] {
  const lista: CanalNotificacion[] =
    canales ?? (destinatarioTipo === "customer" ? ["in_app", "email"] : ["in_app"]);

  const tituloLimpio = sanitizeTexto(titulo);
  const cuerpoLimpio = sanitizeTexto(cuerpo);

  const creadas: Notification[] = lista.map((canal) => ({
    id: uid("ntf"),
    workshop_id: workshopId,
    destinatario_tipo: destinatarioTipo,
    destinatario_id: destinatarioId,
    tipo,
    titulo: tituloLimpio,
    cuerpo: cuerpoLimpio,
    canal,
    // Los canales externos quedan "enviadas" (simulado en demo); in_app "pendiente" hasta leerse.
    estado: canal === "in_app" ? "pendiente" : "enviada",
    link,
    service_order_id: serviceOrderId,
    created_at: nowISO(),
    leida_at: null,
  }));
  db.notifications.push(...creadas);
  return creadas;
}

/** Notifica a todo el personal activo del taller (incluye mecánicos) que gestiona órdenes. */
export function notifyStaffGestion(db: Database, workshopId: string, tipo: string, titulo: string, cuerpo: string, serviceOrderId: string | null = null, link: string | null = null) {
  const miembros = db.workshop_members.filter(
    (m) => m.workshop_id === workshopId && m.activo
  );
  for (const m of miembros) {
    notify({
      db,
      workshopId,
      destinatarioTipo: "user",
      destinatarioId: m.user_id,
      tipo,
      titulo,
      cuerpo,
      canales: ["in_app"],
      link,
      serviceOrderId,
    });
  }
}

/** Notifica al cliente que su solicitud de vinculación fue enviada al taller. */
export function notifyCustomerLinkSent(db: Database, workshopId: string, customerId: string, workshopNombre: string, customerNombre: string, link: string | null = null) {
  notify({
    db,
    workshopId,
    destinatarioTipo: "customer",
    destinatarioId: customerId,
    tipo: "vinculacion_enviada",
    titulo: sanitizeTexto(`Solicitud enviada · ${workshopNombre}`),
    cuerpo: sanitizeTexto(`${customerNombre} envió una solicitud de vinculación a ${workshopNombre}. Queda pendiente de aceptación por el taller.`),
    canales: ["in_app"],
    link,
  });
}
