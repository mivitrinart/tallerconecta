import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Rol, SessionUser } from "@/lib/database/types";
import { homeParaRol } from "@/lib/permissions";

import { getJwtSecret } from "./secret";

// Prefijo __Host-: el navegador exige Secure, Path=/ y sin Domain, lo que
// impide que un subdominio robe o fije la cookie (anti session-fixation).
// En desarrollo local (HTTP sin HTTPS) las cookies Secure no se almacenan,
// por lo que se usa una cookie sin el prefijo __Host- y sin Secure.
// En producción (HTTPS) se mantiene __Host-tc_session con Secure.
const COOKIE_NAME = "__Host-tc_session";
const COOKIE_NAME_DEV = "tc_session";
// Sesiones cortas: 12 horas máximo.
const SESSION_MAX_AGE = 60 * 60 * 12;

function nombreCookie(secure: boolean): string {
  return secure ? COOKIE_NAME : COOKIE_NAME_DEV;
}

export async function signSession(session: SessionUser): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .setIssuer("taller-conecta")
    .setAudience("taller-conecta-app")
    .sign(getJwtSecret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: "taller-conecta",
      audience: "taller-conecta-app",
    });
    const { user_id, nombre, correo, rol, workshop_id, workshop_nombre, session_version } = payload as unknown as SessionUser;
    if (!user_id || !rol) return null;
    return {
      user_id,
      nombre,
      correo,
      rol,
      workshop_id: workshop_id ?? null,
      workshop_nombre: workshop_nombre ?? null,
      session_version: typeof session_version === "number" ? session_version : 0,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value ?? store.get(COOKIE_NAME_DEV)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function setSessionCookieResponse(response: Response, token: string, secure: boolean = true): void {
  const allowIframe = process.env.ALLOW_IFRAME_PREVIEW === "1";
  const name = nombreCookie(secure);
  response.headers.set(
    "Set-Cookie",
    `${name}=${token}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; ${secure ? "Secure;" : ""} SameSite=${allowIframe ? "None" : "Lax"}`
  );
}

export async function setSessionCookie(token: string, secure: boolean = true) {
  const allowIframe = process.env.ALLOW_IFRAME_PREVIEW === "1";
  const name = nombreCookie(secure);
  (await cookies()).set(name, token, {
    httpOnly: true,
    sameSite: allowIframe ? "none" : "lax",
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE, // 12 horas
  });
}

export async function destroySessionCookie() {
  const allowIframe = process.env.ALLOW_IFRAME_PREVIEW === "1";
  const response = new Response(null, { status: 204 });
  response.headers.set("Set-Cookie", `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=${allowIframe ? "None" : "Lax"}`);
  response.headers.append("Set-Cookie", `${COOKIE_NAME_DEV}=; Path=/; Max-Age=0; HttpOnly; SameSite=${allowIframe ? "None" : "Lax"}`);
  return response;
}

export async function requireSession(roles?: Rol[]): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("No autorizado");
  }
  if (roles && !roles.includes(session.rol)) {
    throw new Error("Acceso denegado");
  }
  const requiereTaller = !roles || roles.includes("owner") || roles.includes("advisor") || roles.includes("mechanic");
  if (requiereTaller && session.rol !== "platform_admin" && session.rol !== "customer" && !session.workshop_id) {
    throw new Error("Acceso denegado");
  }
  return session;
}
