/**
 * Re-exportación de etiquetas/colores de estado para componentes de cliente.
 * (Se separa de state-machine.ts para no arrastrar lógica de servidor al cliente.)
 */
import type { EstadoOrden } from "@/lib/database/types";

export type EstadoOrdenUi = EstadoOrden;

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
  entregado: "bg-white",
  cancelado: "bg-red-500",
};
