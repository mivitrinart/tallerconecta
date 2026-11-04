import { NextResponse, type NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { query } from "@/lib/database/index";
import { loginSchema } from "@/lib/validations/schemas";
import { setSessionCookieResponse, signSession } from "@/lib/auth/session";
import { comparePassword } from "@/lib/auth/password";
import { registrarIntento, obtenerIp, validarOrigin } from "@/lib/auth/rate-limit";
import { verificarRateLimitD1, claveRateLimit } from "@/lib/auth/rate-limit-d1";
import { verificarRateLimitKV, claveRateLimitKV } from "@/lib/auth/rate-limit-kv";
import { homeParaRol } from "@/lib/permissions";
import type { Rol, SessionUser } from "@/lib/database/types";
import { mutate, nowISO, uid } from "@/lib/database/index";

// Forzar runtime de Node.js para que el body parsing funcione correctamente en Cloudflare Workers
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
  await initStore();
  const ip = obtenerIp(req);
  const ruta = "/api/auth/login";
  const limite = registrarIntento(ip, ruta);
  if (!limite.permitido) {
    return NextResponse.json({ error: "Demasiados intentos. Intenta de nuevo más tarde." }, { status: 429, headers: { "Retry-After": String(limite.retryAfter ?? 60) } });
  }
  // Segunda capa: límite persistente en D1, compartido entre todas las réplicas del Worker
  const limiteD1 = await verificarRateLimitD1(claveRateLimit(ip, ruta), 10, 60_000);
  if (!limiteD1.permitido) {
    return NextResponse.json(
      { error: "Demasiados intentos desde esta dirección. Intenta de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": String(limiteD1.retryAfter ?? 60) } }
    );
  }
  // Tercera capa: límite persistente en KV (fallback cuando no hay D1/KV configurado).
  const limiteKV = await verificarRateLimitKV(claveRateLimitKV(ip, ruta), 10, 60_000);
  if (!limiteKV.permitido) {
    return NextResponse.json(
      { error: "Demasiados intentos desde esta dirección. Intenta de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": String(limiteKV.retryAfter ?? 60) } }
    );
  }
  if (!validarOrigin(req, req.nextUrl.host)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }
  // Workaround para Cloudflare Workers: leer body como texto y parsear manualmente
  const rawBody = await req.text().catch(() => "");
  let body: Record<string, unknown> | null = null;
  if (rawBody) {
    try { body = JSON.parse(rawBody) as Record<string, unknown>; } catch { body = null; }
  }
  // Honeypot y detección de automatización: rechazar silenciosamente
  if (body && (body.sitio_web || body.automation_detected)) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const correo = parsed.data.correo.trim().toLowerCase();

  const user = query((db) => db.users.find((u) => u.correo === correo) ?? null);
  const passwordOk = user ? comparePassword(parsed.data.password, user.password_hash ?? user.password_demo ?? "") : false;
  if (!user || user.estado !== "activo" || !passwordOk) {
    return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
  }

  let rol: Rol;
  let workshopId: string | null = null;
  let workshopNombre: string | null = null;

  if (user.es_admin_plataforma) {
    rol = "platform_admin";
  } else {
    const membresia = query((db) => {
      const m = db.workshop_members.find((x) => x.user_id === user.id && x.activo);
      if (!m) return null;
      const w = db.workshops.find((x) => x.id === m.workshop_id);
      return w ? { m, w } : null;
    });
    if (!membresia) {
      return NextResponse.json({ error: "Esta cuenta no está asociada a un taller activo." }, { status: 403 });
    }
    rol = membresia.m.rol;
    workshopId = membresia.w.id;
    workshopNombre = membresia.w.nombre;
  }

  const session: SessionUser = {
    user_id: user.id,
    nombre: user.nombre,
    correo: user.correo,
    rol,
    workshop_id: workshopId,
    workshop_nombre: workshopNombre,
    session_version: user.session_version ?? 0,
  };

  // Import dinámico para firmar (jose) sin romper el edge
  const { signSession } = await import("@/lib/auth/session");
  const token = await signSession(session);
  const response = NextResponse.json({ ok: true, rol, redirect: homeParaRol(rol), nombre: user.nombre });
  setSessionCookieResponse(response, token, req.url.startsWith("https:"));

  mutate((db) => {
    db.audit_logs.push({
      id: uid("aud"),
      workshop_id: workshopId,
      actor_id: user.id,
      actor_nombre: user.nombre,
      accion: "auth.login",
      entidad: "users",
      entidad_id: user.id,
      detalle: { rol },
      created_at: nowISO(),
    });
  });

  return response;
  } catch (err) {
    console.error("[500 auth/login] " + (err instanceof Error ? err.message : String(err)));
    return NextResponse.json({ error: "Error interno del servidor. Si el problema persiste, contacta soporte." }, { status: 500 });
  }
}
