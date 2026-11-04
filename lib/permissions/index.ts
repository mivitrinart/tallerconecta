/**
 * Roles y permisos (sección 2 del documento).
 * Cada taller es un espacio privado: un empleado o cliente de un taller
 * nunca puede acceder a los datos de otro (ver guardas de workshop_id).
 */
import type { Rol } from "@/lib/database/types";

export type Accion =
  | "orders.view_all"
  | "orders.view_assigned"
  | "orders.create"
  | "orders.update_status"
  | "orders.update_progress" // mecánico: solo avances de trabajos asignados
  | "orders.assign"
  | "orders.deliver"
  | "diagnostics.write"
  | "estimates.manage"
  | "customers.manage"
  | "vehicles.manage"
  | "messages.reply"
  | "messages.view_all"
  | "media.upload"
  | "settings.manage"
  | "members.manage"
  | "admin.platform";

export const PERMISOS_POR_ROL: Record<Rol, Accion[] | "*"> = {
  owner: "*",
  advisor: [
    "orders.view_all",
    "orders.create",
    "orders.update_status",
    "orders.assign",
    "orders.deliver",
    "diagnostics.write",
    "estimates.manage",
    "customers.manage",
    "vehicles.manage",
    "messages.reply",
    "messages.view_all",
    "media.upload",
  ],
  mechanic: [
    "orders.view_assigned",
    "orders.update_progress",
    "diagnostics.write",
    "messages.reply",
    "media.upload",
  ],
  platform_admin: ["admin.platform"],
  customer: [],
};

export function puede(rol: Rol | undefined | null, accion: Accion): boolean {
  if (!rol) return false;
  const permisos = PERMISOS_POR_ROL[rol];
  if (permisos === "*") return true;
  return permisos.includes(accion);
}

/** Roles que operan dentro de un taller (panel /taller). */
export const ROLES_TALLER: Rol[] = ["owner", "advisor", "mechanic"];

export const ROL_LABEL: Record<Rol, string> = {
  platform_admin: "Administrador de plataforma",
  owner: "Propietario del taller",
  advisor: "Asesor de servicio",
  mechanic: "Mecánico",
  customer: "Cliente",
};

/**
 * Transiciones que un mecánico puede hacer por sí mismo (avances de trabajo).
 * Cualquier otra transición requiere owner/asesor.
 */
export const AVANCES_MECANICO: Record<string, string[]> = {
  en_reparacion: ["en_espera", "en_pruebas"],
  en_espera: ["en_reparacion"],
  en_pruebas: ["listo_entrega", "en_reparacion"],
  autorizado: ["en_reparacion"],
};

/** Página de inicio según el rol. */
export function homeParaRol(rol: Rol): string {
  if (rol === "platform_admin") return "/admin";
  if (rol === "customer") return "/cuenta";
  return "/taller/dashboard";
}
