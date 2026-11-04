import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";

/**
 * Devuelve sólo los datos de sesión que el cliente necesita mostrar.
 * Nunca expone el objeto completo (evita reconocimiento de campos internos)
 * y marca la respuesta como no-cacheable.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  }
  const payload = {
    authenticated: true,
    rol: session.rol,
    nombre: session.nombre,
    workshop_id: session.workshop_id ?? null,
  };
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
