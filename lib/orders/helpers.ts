/** Helpers puros compartidos entre servidor y cliente. */
import type { EstadoOrden } from "@/lib/database/types";

export function esEstadoActivo(e: EstadoOrden): boolean {
  return e !== "entregado" && e !== "cancelado";
}

export function esMismaFechaLocal(iso: string, fecha: Date = new Date()): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === fecha.getFullYear() &&
    d.getMonth() === fecha.getMonth() &&
    d.getDate() === fecha.getDate()
  );
}
