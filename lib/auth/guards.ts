/**
 * Guardas de autorización para las rutas de API.
 * Aíslan los datos por taller: ninguna operación cruza workshop_id.
 *
 * SEGURIDAD: en cada petición se consulta la BD para verificar que el usuario
 * siga activo, el miembro siga activo y el taller no esté suspendido. También
 * se compara session_version para invalidar cookies inmediatamente al cambiar
 * contraseña o desactivar personal.
 */
import { NextResponse } from "next/server";
import { getSession } from "./session";
import { puede, type Accion } from "@/lib/permissions";
import type { Customer, CustomerAccount, SessionUser } from "@/lib/database/types";
import { query } from "@/lib/database/index";

export type StaffGuard =
  | { ok: true; session: SessionUser; workshopId: string; actor: { id: string; nombre: string } }
  | { ok: false; response: NextResponse };

export async function guardStaff(accion?: Accion): Promise<StaffGuard> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Sesión requerida. Inicia de nuevo." }, { status: 401 }) };
  }
  if (session.rol === "platform_admin" || session.rol === "customer") {
    return { ok: false, response: NextResponse.json({ error: "Esta cuenta no opera el panel del taller." }, { status: 403 }) };
  }
  if (!session.workshop_id) {
    return { ok: false, response: NextResponse.json({ error: "La cuenta no está asociada a un taller." }, { status: 403 }) };
  }

  // Verificación en vivo: estado del usuario, miembro activo y taller no suspendido.
  const user = query((db) => db.users.find((u) => u.id === session.user_id));
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Usuario no encontrado." }, { status: 401 }) };
  }
  if (user.estado !== "activo") {
    return { ok: false, response: NextResponse.json({ error: "Usuario desactivado. Sesión revocada." }, { status: 401 }) };
  }
  // Revocación inmediata al cambiar contraseña o desactivar personal.
  if (typeof session.session_version === "number" && typeof user.session_version === "number" && session.session_version !== user.session_version) {
    return { ok: false, response: NextResponse.json({ error: "Sesión revocada. Inicia de nuevo." }, { status: 401 }) };
  }

  const member = query((db) => db.workshop_members.find((m) => m.workshop_id === session.workshop_id && m.user_id === session.user_id));
  if (!member || !member.activo) {
    return { ok: false, response: NextResponse.json({ error: "Miembro no activo en el taller." }, { status: 401 }) };
  }
  const workshop = query((db) => db.workshops.find((w) => w.id === session.workshop_id));
  if (!workshop || workshop.estado === "suspendido") {
    return { ok: false, response: NextResponse.json({ error: "Taller suspendido. Sesión revocada." }, { status: 401 }) };
  }
  if (accion && !puede(member.rol, accion)) {
    return { ok: false, response: NextResponse.json({ error: "Tu rol no tiene permiso para esta acción." }, { status: 403 }) };
  }
  return {
    ok: true,
    session,
    workshopId: session.workshop_id,
    actor: { id: session.user_id, nombre: session.nombre },
  };
}

export type AdminGuard =
  | { ok: true; session: SessionUser; actor: { id: string; nombre: string } }
  | { ok: false; response: NextResponse };

export async function guardAdmin(): Promise<AdminGuard> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Sesión requerida." }, { status: 401 }) };
  }
  if (session.rol !== "platform_admin") {
    return { ok: false, response: NextResponse.json({ error: "Solo administradores de la plataforma." }, { status: 403 }) };
  }
  const user = query((db) => db.users.find((u) => u.id === session.user_id));
  if (!user || !user.es_admin_plataforma) {
    return { ok: false, response: NextResponse.json({ error: "Usuario no autorizado." }, { status: 403 }) };
  }
  if (user.estado !== "activo") {
    return { ok: false, response: NextResponse.json({ error: "Usuario desactivado. Sesión revocada." }, { status: 401 }) };
  }
  if (typeof session.session_version === "number" && typeof user.session_version === "number" && session.session_version !== user.session_version) {
    return { ok: false, response: NextResponse.json({ error: "Sesión revocada. Inicia de nuevo." }, { status: 401 }) };
  }
  return { ok: true, session, actor: { id: session.user_id, nombre: session.nombre } };
}

export type CustomerGuard =
  | { ok: true; customer: Customer; workshopId: string }
  | { ok: false; response: NextResponse };

/** Acceso del portal del cliente mediante su enlace personal (token). */
export function guardCustomerToken(token?: string): CustomerGuard {
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "Enlace personal no proporcionado." }, { status: 401 }) };
  }
  const found = query((db) => {
    const customer = db.customers.find((c) => c.portal_token === token);
    if (!customer || customer.anonimizado) return null;
    if (customer.portal_activo === false) return { revoked: true as const };
    const ws = db.workshops.find((w) => w.id === customer.workshop_id);
    if (!ws) return null;
    return { customer, workshopId: ws.id };
  });
  if (!found) {
    return { ok: false, response: NextResponse.json({ error: "Enlace inválido o expirado. Pide uno nuevo a tu taller." }, { status: 404 }) };
  }
  if ("revoked" in found) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Este enlace fue desactivado al desvincular la ficha de tu cuenta. Vuelve a vincularlo desde tu cuenta o pide al taller que lo reactive." },
        { status: 403 }
      ),
    };
  }
  return { ok: true, customer: found.customer, workshopId: found.workshopId };
}

export type AccountGuard =
  | { ok: true; account: CustomerAccount }
  | { ok: false; response: NextResponse };

/** Acceso con cuenta de cliente (sesión rol "customer"). */
export async function guardCustomerAccount(): Promise<AccountGuard> {
  const session = await getSession();
  if (!session || session.rol !== "customer") {
    return { ok: false, response: NextResponse.json({ error: "Inicia sesión con tu cuenta de cliente." }, { status: 401 }) };
  }
  const account = query(
    (db) => db.customer_accounts.find((a) => a.id === session.user_id && a.estado === "activo") ?? null
  );
  if (!account) {
    return { ok: false, response: NextResponse.json({ error: "Cuenta no encontrada o eliminada." }, { status: 401 }) };
  }
  return { ok: true, account };
}

/** Acceso a un medio: personal del taller, cuenta vinculada o enlace personal. */
export function guardMediaAccess(opts: {
  mediaWorkshopId: string;
  mediaCustomerId: string;
  mediaVisibleCliente: boolean;
  token?: string;
}): boolean {
  const found = query((db) => {
    if (opts.token) {
      const customer = db.customers.find((c) => c.portal_token === opts.token && !c.anonimizado);
      return customer?.id === opts.mediaCustomerId && customer.portal_activo !== false && (opts.mediaVisibleCliente || false);
    }
    return false;
  });
  return found;
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export function okJson(data: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...data });
}
