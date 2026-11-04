/**
 * Máquina de estados de la orden de servicio (sección 4 del documento).
 *
 * Regla fundamental: una orden NO puede pasar a "en_reparacion" si existe un
 * presupuesto enviado con ítems que requieren autorización y aún están
 * pendientes de decisión del cliente.
 */
import type { EstadoOrden, Estimate, EstimateItem } from "@/lib/database/types";

export const ESTADOS_ORDEN: EstadoOrden[] = [
  "recibido",
  "en_diagnostico",
  "esperando_aprobacion",
  "autorizado",
  "en_reparacion",
  "en_espera",
  "en_pruebas",
  "listo_entrega",
  "entregado",
  "cancelado",
];

export const ESTADO_LABEL: Record<EstadoOrden, string> = {
  recibido: "Recibido",
  en_diagnostico: "En diagnóstico",
  esperando_aprobacion: "Esperando aprobación",
  autorizado: "Autorizado",
  en_reparacion: "En reparación",
  en_espera: "En espera",
  en_pruebas: "En pruebas",
  listo_entrega: "Listo para entregar",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const ESTADO_DESCRIPCION: Record<EstadoOrden, string> = {
  recibido: "El taller registró el vehículo.",
  en_diagnostico: "Se están identificando los problemas.",
  esperando_aprobacion: "El cliente debe decidir sobre el presupuesto.",
  autorizado: "Se puede iniciar el trabajo aprobado.",
  en_reparacion: "El mecánico está trabajando.",
  en_espera: "Falta un repuesto, una respuesta u otro recurso.",
  en_pruebas: "Se verifica el trabajo realizado.",
  listo_entrega: "El servicio terminó y el vehículo está pendiente de recogida.",
  entregado: "El cliente recibió el vehículo.",
  cancelado: "La orden fue cancelada y se registró el motivo.",
};

/** Colores Tailwind por estado (badges, timeline, kanban). */
export const ESTADO_COLOR: Record<EstadoOrden, string> = {
  recibido: "bg-slate-100 text-slate-700 border-slate-300",
  en_diagnostico: "bg-sky-100 text-sky-800 border-sky-300",
  esperando_aprobacion: "bg-amber-100 text-amber-800 border-amber-300",
  autorizado: "bg-teal-100 text-teal-800 border-teal-300",
  en_reparacion: "bg-blue-100 text-blue-800 border-blue-300",
  en_espera: "bg-orange-100 text-orange-800 border-orange-300",
  en_pruebas: "bg-violet-100 text-violet-800 border-violet-300",
  listo_entrega: "bg-emerald-100 text-emerald-800 border-emerald-300",
  entregado: "bg-emerald-600 text-white border-emerald-700",
  cancelado: "bg-red-100 text-red-700 border-red-300",
};

export const ESTADO_PUNTO: Record<EstadoOrden, string> = {
  recibido: "bg-slate-400",
  en_diagnostico: "bg-sky-500",
  esperando_aprobacion: "bg-amber-500",
  autorizado: "bg-teal-500",
  en_reparacion: "bg-blue-500",
  en_espera: "bg-orange-500",
  en_pruebas: "bg-violet-500",
  listo_entrega: "bg-emerald-500",
  entregado: "bg-emerald-600",
  cancelado: "bg-red-500",
};

/** Transiciones permitidas desde cada estado. */
export const TRANSICIONES: Record<EstadoOrden, EstadoOrden[]> = {
  recibido: ["en_diagnostico", "esperando_aprobacion", "cancelado"],
  en_diagnostico: ["esperando_aprobacion", "autorizado", "en_reparacion", "cancelado"],
  esperando_aprobacion: ["autorizado", "en_diagnostico", "en_espera", "cancelado"],
  autorizado: ["en_reparacion", "en_espera", "cancelado"],
  en_reparacion: ["en_espera", "en_pruebas", "esperando_aprobacion", "cancelado"],
  en_espera: ["en_reparacion", "en_diagnostico", "esperando_aprobacion", "autorizado", "cancelado"],
  en_pruebas: ["listo_entrega", "en_reparacion", "cancelado"],
  listo_entrega: ["entregado"],
  entregado: [],
  cancelado: [],
};

export interface ContextoTransicion {
  estimateActual?: Estimate | null;
  itemsEstimateActual?: EstimateItem[];
  motivo?: string;
}

export interface ResultadoTransicion {
  ok: boolean;
  error?: string;
}

/**
 * ¿Existe un presupuesto vigente con trabajo pendiente de autorización?
 * (Presupuesto enviado, con ítems que requieren autorización en estado pendiente)
 */
export function hayAutorizacionPendiente(
  estimate: Estimate | null | undefined,
  items: EstimateItem[] | undefined
): boolean {
  if (!estimate) return false;
  if (estimate.estado !== "enviada") return false;
  if (!items || items.length === 0) return false;
  return items.some((i) => i.requiere_autorizacion && i.estado === "pendiente");
}

/**
 * Valida una transición de estado aplicando las reglas del documento.
 */
export function validarTransicion(
  desde: EstadoOrden,
  hacia: EstadoOrden,
  ctx: ContextoTransicion = {}
): ResultadoTransicion {
  if (desde === hacia) {
    return { ok: false, error: `La orden ya se encuentra en estado "${ESTADO_LABEL[desde]}".` };
  }
  const permitidas = TRANSICIONES[desde] ?? [];
  if (!permitidas.includes(hacia)) {
    return {
      ok: false,
      error: `No se puede pasar de "${ESTADO_LABEL[desde]}" a "${ESTADO_LABEL[hacia]}". Transiciones permitidas: ${
        permitidas.length ? permitidas.map((e) => ESTADO_LABEL[e]).join(", ") : "ninguna (estado final)"
      }.`,
    };
  }

  // Regla fundamental: no iniciar reparación con autorización pendiente.
  if (hacia === "en_reparacion") {
    if (hayAutorizacionPendiente(ctx.estimateActual, ctx.itemsEstimateActual)) {
      return {
        ok: false,
        error:
          "Hay un presupuesto enviado con trabajos pendientes de autorización del cliente. " +
          "La orden no puede pasar a reparación hasta que el cliente decida.",
      };
    }
    // Si hubo presupuesto y todo fue rechazado, tampoco se puede reparar.
    if (ctx.estimateActual && ctx.estimateActual.estado === "rechazada") {
      return {
        ok: false,
        error:
          "El presupuesto vigente fue rechazado por el cliente. Crea una nueva versión del presupuesto o cancela la orden.",
      };
    }
  }

  if (hacia === "cancelado" && !ctx.motivo?.trim()) {
    return { ok: false, error: "Para cancelar una orden debes registrar el motivo." };
  }

  return { ok: true };
}

/** Estados "activos" (ni entregados ni cancelados). */
export function esEstadoActivo(e: EstadoOrden): boolean {
  return e !== "entregado" && e !== "cancelado";
}

/** Ruta feliz del flujo principal, para la línea de tiempo del cliente. */
export const FLUJO_PRINCIPAL: EstadoOrden[] = [
  "recibido",
  "en_diagnostico",
  "esperando_aprobacion",
  "autorizado",
  "en_reparacion",
  "en_pruebas",
  "listo_entrega",
  "entregado",
];
