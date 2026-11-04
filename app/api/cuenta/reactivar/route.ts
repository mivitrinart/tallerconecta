import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { getSession } from "@/lib/auth/session";
import { mutate } from "@/lib/database/index";
import { nowISO, uid } from "@/lib/database/index";

/** Reactiva la propia cuenta de cliente eliminada (estado "eliminado" -> "activo"). Auto-servicio.
 *  GET: redirige a /cuenta. POST: reactiva y redirige a /cuenta. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  return Response.redirect(new URL("/cuenta", url.origin));
}

export async function POST(req: NextRequest) {
  await initStore();
  const session = await getSession();
  if (!session || session.rol !== "customer") {
    return Response.redirect(new URL("/cuenta/login", req.url));
  }

  const res = mutate((db) => {
    const acc = db.customer_accounts.find((a) => a.id === session.user_id);
    if (!acc) return { ok: false, error: "Cuenta no encontrada." };
    if (acc.estado === "activo") return { ok: true, id: session.user_id, yaActiva: true };

    acc.estado = "activo";

    db.audit_logs.push({
      id: uid("aud"),
      workshop_id: null,
      actor_id: session.user_id,
      actor_nombre: session.nombre,
      accion: "cuenta_cliente.reactivar",
      entidad: "customer_accounts",
      entidad_id: session.user_id,
      detalle: { motivo: "reactivacion_auto_servicio" },
      created_at: nowISO(),
    });

    return { ok: true, id: session.user_id };
  });

  if (!res.ok) {
    return Response.redirect(new URL("/cuenta/login", req.url));
  }
  await flushStore();
  return Response.redirect(new URL("/cuenta", req.url));
}
