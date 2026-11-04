import { NextResponse, type NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { query, mutate } from "@/lib/database/index";
import { customerAccountRegisterSchema } from "@/lib/validations/schemas";
import { hashPassword } from "@/lib/auth/password";
import { uid, nowISO } from "@/lib/database/d1-store";
import { setSessionCookieResponse, signSession } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/database/types";
import { registrarIntento, obtenerIp, validarOrigin } from "@/lib/auth/rate-limit";

/** Creación de cuenta para clientes (con autorización de tratamiento de datos). */
export async function POST(req: NextRequest) {
  try {
  await initStore();
  const ip = obtenerIp(req);
  const limite = registrarIntento(ip, "/api/cuenta/registro");
  if (!limite.permitido) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": String(limite.retryAfter ?? 60) } }
    );
  }
  if (!validarOrigin(req, req.nextUrl.host)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (body?.sitio_web || body?.automation_detected) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
  const parsed = customerAccountRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revisa los datos." }, { status: 400 });
  }

  const nombre = parsed.data.nombre.trim();
  const correo = parsed.data.correo.trim().toLowerCase();
  const telefono = parsed.data.telefono.replace(/\s/g, "");
  const passwordHash = hashPassword(parsed.data.password);
  const ahora = nowISO();

  // Si ya existe una cuenta con ese correo (taller o cliente), rechazar
  const existente = query((db) =>
    db.customer_accounts.find((a) => a.correo === correo) ||
    db.users.find((u) => u.correo === correo)
  );
  if (existente) {
    return NextResponse.json({ error: "correo registrado como cliente o taller" }, { status: 400 });
  }

  // Crear cuenta vía mutate() ? actualiza el cache + programa persistencia a D1
  const res = mutate((db) => {
    if (db.customer_accounts.some((a) => a.correo === correo && a.estado === "activo")) {
      const cuentaExistente = db.customer_accounts.find((a) => a.correo === correo && a.estado === "activo")!;
      return { ok: true as const, accountId: cuentaExistente.id, existing: true as const };
    }
    const accountIdLocal = uid("acc");
    const account = {
      id: accountIdLocal,
      nombre,
      correo,
      telefono,
      estado: "activo" as const,
      password_hash: passwordHash,
      consentimiento_datos_at: ahora,
      created_at: ahora,
    };
    db.customer_accounts.push(account);
    db.audit_logs.push({
      id: uid("aud"),
      workshop_id: null,
      actor_id: account.id,
      actor_nombre: nombre,
      accion: "cuenta_cliente.crear",
      entidad: "customer_accounts",
      entidad_id: account.id,
      detalle: { consentimiento_datos_at: ahora, vinculacion: "solo_por_enlace_personal" },
      created_at: ahora,
    });
    return { ok: true as const, accountId: accountIdLocal, existing: false as const };
  });

  if (!("ok" in res) || !res.ok || "error" in res) {
    const mensaje = "error" in res && typeof (res as { error?: unknown }).error === "string" ? (res as { error: string }).error : "No se pudo crear la cuenta.";
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }

  await flushStore();

  const session: SessionUser = {
    user_id: res.accountId,
    nombre,
    correo,
    rol: "customer",
    workshop_id: null,
    workshop_nombre: null,
    session_version: 0,
  };

  const token = await signSession(session);
  const response = NextResponse.json({ ok: true, redirect: "/cuenta" });
  setSessionCookieResponse(response, token, req.url.startsWith("https:"));
  return response;
  } catch (err: any) {
    console.error("[500 registro cuenta] " + (err instanceof Error ? err.message : String(err)));
    return NextResponse.json({ error: err?.message || String(err) || "Error interno al crear la cuenta. Intenta de nuevo." }, { status: 500 });
  }
}
