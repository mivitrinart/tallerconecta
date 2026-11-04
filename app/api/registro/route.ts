import { NextResponse, type NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { registroSchema } from "@/lib/validations/schemas";
import { registerWorkshop } from "@/lib/orders/workflows";
import { query, mutate, nowISO, uid } from "@/lib/database/index";
import { setSessionCookie, signSession } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/database/types";
import { registrarIntento, obtenerIp, validarOrigin } from "@/lib/auth/rate-limit";
import { verificarRateLimitKV, claveRateLimitKV } from "@/lib/auth/rate-limit-kv";

export async function POST(req: NextRequest) {
  try {
    await initStore();
    const ip = obtenerIp(req);
    const ruta = "/api/registro";
    const limite = registrarIntento(ip, ruta);
    if (!limite.permitido) {
      return NextResponse.json({ error: "Demasiados intentos. Intenta de nuevo más tarde." }, { status: 429, headers: { "Retry-After": String(limite.retryAfter ?? 60) } });
    }
    // Capa persistente en KV (compartida entre réplicas del Worker).
    const limiteKV = await verificarRateLimitKV(claveRateLimitKV(ip, ruta), 3, 10 * 60_000);
    if (!limiteKV.permitido) {
      return NextResponse.json(
        { error: "Demasiados registros desde esta dirección. Intenta de nuevo más tarde." },
        { status: 429, headers: { "Retry-After": String(limiteKV.retryAfter ?? 600) } }
      );
    }
    if (!validarOrigin(req, req.nextUrl.host)) {
      return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    }
    const body = await req.json().catch(() => null);
    // Honeypot y detección de automatización: rechazar silenciosamente
    if (body?.sitio_web || body?.automation_detected) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    const parsed = registroSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." }, { status: 400 });
    }
    parsed.data.telefono = parsed.data.telefono.replace(/\s/g, "");

    const resultado = registerWorkshop(parsed.data);
    if (!resultado.ok || !resultado.workshopId) {
      return NextResponse.json({ error: resultado.error ?? "No se pudo registrar el taller." }, { status: 400 });
    }

    // Sesión inmediata como propietario del nuevo taller
    const data = query((db) => {
      const user = db.users.find((u) => u.id === resultado.userId)!;
      const ws = db.workshops.find((w) => w.id === resultado.workshopId)!;
      return { user, ws };
    });

    const session: SessionUser = {
      user_id: data.user.id,
      nombre: data.user.nombre,
      correo: data.user.correo,
      rol: "owner",
      workshop_id: data.ws.id,
      workshop_nombre: data.ws.nombre,
    };
    await setSessionCookie(await signSession(session), req.url.startsWith("https:"));

    mutate((db) => {
      db.audit_logs.push({
        id: uid("aud"),
        workshop_id: data.ws.id,
        actor_id: data.user.id,
        actor_nombre: data.user.nombre,
        accion: "auth.login",
        entidad: "users",
        entidad_id: data.user.id,
        detalle: { origen: "registro" },
        created_at: nowISO(),
      });
    });
    await flushStore();

    return NextResponse.json({ ok: true, redirect: "/taller/dashboard" });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Error interno del servidor al registrar el taller." }, { status: 500 });
  }
}
