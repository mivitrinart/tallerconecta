import type { NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { guardAdmin, fail, okJson } from "@/lib/auth/guards";
import { mutate, nowISO, uid } from "@/lib/database/index";

/** Reactiva una cuenta de cliente eliminada (estado "eliminado" -> "activo"). Solo platform_admin. */
export async function POST(req: NextRequest) {
  await initStore();
  const admin = await guardAdmin();
  if (!admin.ok) return admin.response;

  const body = await req.json().catch(() => null);
  const accountId = typeof body?.account_id === "string" ? body.account_id.trim() : "";
  if (!accountId) {
    return fail("ID de cuenta requerido.", 400);
  }

  const res = mutate((db) => {
    const acc = db.customer_accounts.find((a) => a.id === accountId);
    if (!acc) return { ok: false, error: "Cuenta no encontrada." };
    if (acc.estado === "activo") return { ok: false, error: "La cuenta ya está activa." };

    acc.estado = "activo";
    acc.password_demo = acc.password_demo ?? undefined;

    db.audit_logs.push({
      id: uid("aud"),
      workshop_id: null,
      actor_id: admin.session.user_id,
      actor_nombre: admin.session.nombre,
      accion: "cuenta_cliente.reactivar",
      entidad: "customer_accounts",
      entidad_id: accountId,
      detalle: { motivo: "reactivacion_por_administrador" },
      created_at: nowISO(),
    });

    return { ok: true, id: accountId };
  });

  if (!res.ok) return fail(res.error ?? "Error desconocido", 400);
  await flushStore();
  return okJson({ id: res.id });
}
