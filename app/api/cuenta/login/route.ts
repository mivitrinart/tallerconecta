import { NextResponse, type NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { loginSchema } from "@/lib/validations/schemas";
import { loginCustomerAccount } from "@/lib/orders/workflows";
import { getCustomerAccountById } from "@/lib/database/queries";
import { setSessionCookieResponse, signSession } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/database/types";
import { registrarIntento, obtenerIp, validarOrigin } from "@/lib/auth/rate-limit";

// Forzar runtime de Node.js para que el body parsing funcione correctamente en Cloudflare Workers
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await initStore();
    const ip = obtenerIp(req);
    const ruta = "/api/cuenta/login";
    const limite = registrarIntento(ip, ruta);
    if (!limite.permitido) {
      return NextResponse.json({ error: "Demasiados intentos. Intenta de nuevo más tarde." }, { status: 429, headers: { "Retry-After": String(limite.retryAfter ?? 60) } });
    }
    if (!validarOrigin(req, req.nextUrl.host)) {
      return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    }
    // Workaround para Cloudflare Workers: leer body como texto y parsear manualmente
    const rawBody = await req.text().catch(() => "");
    let body: Record<string, unknown> | null = null;
    if (rawBody.trim()) {
      try { body = JSON.parse(rawBody) as Record<string, unknown>; } catch { body = null; }
    }
    if (!body || typeof body.correo !== "string" || typeof body.password !== "string") {
      return NextResponse.json({ error: "Correo y contraseña son requeridos." }, { status: 400 });
    }
    // Honeypot y detección de automatización: rechazar silenciosamente
    if (body.sitio_web || body.automation_detected) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    const parsed = loginSchema.safeParse({ correo: body.correo, password: body.password });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }

    const resultado = loginCustomerAccount(parsed.data.correo, parsed.data.password);
    if (!resultado.ok || !resultado.accountId) {
      // No revelar si el correo existe o no (previene enumeración de cuentas)
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }

    const account = getCustomerAccountById(resultado.accountId);
    if (!account) {
      return NextResponse.json({ error: "Cuenta no encontrada." }, { status: 401 });
    }

    const session: SessionUser = {
      user_id: account.id,
      nombre: account.nombre,
      correo: account.correo,
      rol: "customer",
      workshop_id: null,
      workshop_nombre: null,
      session_version: 0,
    };

    const token = await signSession(session);
    const response = NextResponse.json({ ok: true, redirect: "/cuenta" });
    setSessionCookieResponse(response, token, req.url.startsWith("https:"));
    return response;
    } catch (err) {
      console.error("[500] " + (err instanceof Error ? err.message : String(err)));
      return NextResponse.json({ error: "Error interno del servidor. Si el problema persiste, contacta soporte." }, { status: 500 });
    }
  }
