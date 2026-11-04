import { NextResponse, type NextRequest } from "next/server";
import { initStore, flushStore } from "@/lib/api/init-store";
import { verifyCode } from "@/lib/auth/verification";

/**
 * POST /api/auth/verification/verify
 * Verifica un código de verificación.
 * Body: { correo, code, purpose: "register" | "reset_password" }
 */
export async function POST(req: NextRequest) {
  await initStore();
  const body = await req.json().catch(() => null);
  if (!body?.correo || !body?.code || !body?.purpose) {
    return NextResponse.json(
      { error: "Correo, código y propósito son requeridos." },
      { status: 400 }
    );
  }

  const { correo, code, purpose } = body;
  const resultado = verifyCode({ correo: correo.trim().toLowerCase(), code: code.trim(), purpose });

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 400 });
  }

  await flushStore();
  return NextResponse.json({
    ok: true,
    email: resultado.email,
    nombre: resultado.nombre,
    message: "Código verificado correctamente.",
  });
}
