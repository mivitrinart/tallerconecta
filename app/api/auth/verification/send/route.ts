import { NextResponse, type NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { sendVerificationCode } from "@/lib/auth/verification";
import { registrarIntento, obtenerIp, validarOrigin } from "@/lib/auth/rate-limit";
import { query, mutate } from "@/lib/database/index";

/**
 * POST /api/auth/verification/send
 * Solicita un código de verificación por correo electrónico.
 * Body: { correo, nombre, purpose: "register" | "reset_password" }
 */
export async function POST(req: NextRequest) {
  await initStore();
  const ip = obtenerIp(req);
  const ruta = "/api/auth/verification/send";
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
  if (!body?.correo || !body?.nombre || !body?.purpose) {
    return NextResponse.json(
      { error: "Correo, nombre y propósito son requeridos." },
      { status: 400 }
    );
  }

  const { correo, nombre, purpose } = body;
  const correoLower = correo.trim().toLowerCase();

  // Para registro: verificar que el correo no exista ya
  if (purpose === "register") {
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
  }

  // Para reset de contraseña: verificar que el correo exista
  if (purpose === "reset_password") {
    const existente = query((db) =>
      db.users.find((u) => u.correo === correoLower) ||
      db.customer_accounts.find((c) => c.correo === correoLower)
    );
    if (!existente) {
      return NextResponse.json(
        { error: "No existe una cuenta con este correo electrónico." },
        { status: 404 }
      );
    }
  }

  const resultado = await sendVerificationCode({ correo: correoLower, nombre: nombre.trim(), purpose });
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 500 });
  }

  await flushStore();
  return NextResponse.json({
    ok: true,
    message: "Código de verificación enviado. Revisa tu correo electrónico.",
    correo: correoLower,
  });
}
