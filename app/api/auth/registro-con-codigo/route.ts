import { NextResponse, type NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { query, mutate } from "@/lib/database/index";
import { registrarIntento, obtenerIp, validarOrigin } from "@/lib/auth/rate-limit";
import { hashPassword } from "@/lib/auth/password";
import { uid } from "@/lib/database/index";
import { verifyCode } from "@/lib/auth/verification";

/**
 * POST /api/auth/registro-con-codigo
 * Crea una cuenta de cliente después de verificar el código de correo.
 * Body: { correo, nombre, password, telefono, code }
 */
export async function POST(req: NextRequest) {
  await initStore();
  const ip = obtenerIp(req);
  const ruta = "/api/auth/registro-con-codigo";
  const limite = registrarIntento(ip, ruta);
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
  if (!body?.correo || !body?.nombre || !body?.password || !body?.telefono || !body?.code) {
    return NextResponse.json(
      { error: "Todos los campos son requeridos." },
      { status: 400 }
    );
  }

  const { correo, nombre, password, telefono, code } = body;
  const correoLower = correo.trim().toLowerCase();

  // Verificar que el código sea válido
  const verificacion = verifyCode({ correo: correoLower, code: code.trim(), purpose: "register" });
  if (!verificacion.ok) {
    return NextResponse.json({ error: verificacion.error }, { status: 400 });
  }

  // Verificar que el correo no exista ya
  const existente = query((db) =>
    db.users.find((u) => u.correo === correoLower) ||
    db.customer_accounts.find((c) => c.correo === correoLower)
  );
  if (existente) {
    return NextResponse.json(
      { error: "Ya existe una cuenta con este correo electrónico." },
      { status: 400 }
    );
  }

  // Hash de la contraseña
  const passwordHash = await hashPassword(password);

  // Crear la cuenta
  const id = uid("cuenta");
  const ahora = new Date().toISOString();

  mutate((db) => {
    db.customer_accounts.push({
      id,
      nombre: nombre.trim(),
      correo: correoLower,
      telefono: telefono.trim(),
      estado: "activo",
      password_hash: passwordHash,
      consentimiento_datos_at: ahora,
      email_verified: true,
      email_verified_at: ahora,
      created_at: ahora,
    });
  });

  await flushStore();

  return NextResponse.json({
    ok: true,
    accountId: id,
    message: "Cuenta creada exitosamente.",
    redirect: "/cuenta/login",
  });
}
