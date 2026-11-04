/**
 * Límites de plan SaaS aplicados en backend.
 *
 * Starter: 1 usuario (solo el propietario), hasta 10 órdenes de servicio por
 * mes calendario.
 * Pro: hasta 10 usuarios, órdenes ilimitadas.
 * Premium: usuarios ilimitados, órdenes ilimitadas.
 *
 * El plan vigente se lee de la suscripción más reciente del taller.
 */
import type { Database, EstadoSuscripcion, PlanSaaS } from "@/lib/database/types";

export const PLAN_LIMITE_USUARIOS: Record<PlanSaaS, number | null> = {
  starter: 1,
  pro: 10,
  premium: null,
};

export const PLAN_LIMITE_ORDENES_MES: Record<PlanSaaS, number | null> = {
  starter: 10,
  pro: null,
  premium: null,
};

export interface PlanVigente {
  plan: PlanSaaS;
  estado: EstadoSuscripcion;
}

export function planVigente(db: Database, workshopId: string): PlanVigente | null {
  const subs = db.subscriptions
    .filter((s) => s.workshop_id === workshopId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const sub = subs[0];
  if (!sub) return null;
  return { plan: sub.plan, estado: sub.estado };
}

export function limiteUsuarios(plan: PlanSaaS): number | null {
  return PLAN_LIMITE_USUARIOS[plan];
}

export function limiteOrdenesMes(plan: PlanSaaS): number | null {
  return PLAN_LIMITE_ORDENES_MES[plan];
}

/**
 * Valida si el taller puede crear una nueva orden este mes según su plan.
 * Devuelve { ok: true } o { ok: false, error } con el mensaje para el usuario.
 */
export function validarCupoOrdenesMes(
  db: Database,
  workshopId: string
): { ok: true } | { ok: false; error: string } {
  const pv = planVigente(db, workshopId);
  const plan = pv?.plan ?? "starter";
  const limite = limiteOrdenesMes(plan);
  if (limite === null) return { ok: true };

  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const cuenta = db.service_orders.filter(
    (o) => o.workshop_id === workshopId && new Date(o.created_at) >= inicioMes
  ).length;

  if (cuenta >= limite) {
    return {
      ok: false,
      error: `Has alcanzado el límite de ${limite} órdenes de servicio este mes con el plan ${plan.toUpperCase()}. Cambia a Pro o Premium para órdenes ilimitadas.`,
    };
  }
  return { ok: true };
}

/**
 * Valida si se puede agregar un miembro más al taller según el plan.
 * Starter solo permite al propietario (1 usuario total).
 */
export function validarCupoMiembros(
  db: Database,
  workshopId: string
): { ok: true } | { ok: false; error: string } {
  const pv = planVigente(db, workshopId);
  const plan = pv?.plan ?? "starter";
  const limite = limiteUsuarios(plan);
  if (limite === null) return { ok: true };

  const miembrosActivos = db.workshop_members.filter(
    (m) => m.workshop_id === workshopId && m.activo
  );

  if (miembrosActivos.length >= limite) {
    return {
      ok: false,
      error: `Tu plan permite hasta ${limite} usuario(s) activo(s). El plan Starter es solo para el propietario; invita a más personas con Pro o Premium.`,
    };
  }
  return { ok: true };
}
