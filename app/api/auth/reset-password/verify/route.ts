import { NextResponse, type NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { query, mutate } from "@/lib/database/index";
import { registrarIntento, obtenerIp, validarOrigin } from "@/lib/auth/rate-limit";
import { hashPassword } from "@/lib/auth/password";
import { verifyCode } from "@/lib/auth/verification";

/**
 * POST /api/auth/reset-password/verify
 * Verifica el código de restablecimiento y cambia la contraseña.
 * Body: { correo, code, password }
 */
export async function POST(req: NextRequest) {
  await initStore();
  const ip = obtenerIp(req);
  const ruta = "/api/auth/reset-password/verify";
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
  if (!body?.correo || !body?.code || !body?.password) {
    return NextResponse.json(
      { error: "Correo, código y contraseña son requeridos." },
      { status: 400 }
    );
  }

  const { correo, code, password } = body;
  const correoLower = correo.trim().toLowerCase();

  // Validar longitud de contraseña
  if (password.length < 8 || password.length > 72) {
    return NextResponse.json(
      { error: "La contraseña debe tener entre 8 y 72 caracteres." },
      { status: 400 }
    );
  }

  // Verificar el código
  const verificacion = verifyCode({ correo: correoLower, code: code.trim(), purpose: "reset_password" });
  if (!verificacion.ok) {
    return NextResponse.json({ error: verificacion.error }, { status: 400 });
  }

  // Verificar que el usuario exista
  const user = query((db) =>
    db.users.find((u) => u.correo === correoLower) ||
    db.customer_accounts.find((c) => c.correo === correoLower)
  );
  if (!user) {
    return NextResponse.json({ error: "Cuenta no encontrada." }, { status: 404 });
  }

  // Hash de la nueva contraseña
  const passwordHash = await hashPassword(password);
  const ahora = new Date().toISOString();

  // Actualizar la contraseña y marcar el email como verificado
  mutate((db) => {
    const cuenta = db.customer_accounts.find((c) => c.correo === correoLower);
    if (cuenta) {
      cuenta.password_hash = passwordHash;
      cuenta.email_verified = true;
      cuenta.email_verified_at = ahora;
    }
    const usuario = db.users.find((u) => u.correo === correoLower);
    if (usuario) {
      usuario.password_hash = passwordHash;
      usuario.email_verified = true;
      usuario.email_verified_at = ahora;
      usuario.session_version = (usuario.session_version ?? 0) + 1;
    }
  });

  await flushStore();

  return NextResponse.json({
    ok: true,
    message: "Contraseña restablecida correctamente. Ya puedes iniciar sesión.",
  });
}
