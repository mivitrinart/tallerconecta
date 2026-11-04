/**
 * Middleware de borde (Edge) - Taller Conecta
 *
 * Doble responsabilidad:
 *  1. SEGURIDAD PERIMETRAL (todas las rutas públicas incluidas):
 *     - Content-Security-Policy estricto con nonce criptográfico por petición
 *     - Cabeceras OWASP completas (HSTS, COOP, CORP, nosniff, Referrer-Policy…)
 *     - Bloqueo de rutas sensibles (.env, .git, wp-admin, …) → 404
 *     - Bloqueo de User-Agents de herramientas de ataque → 403
 *  2. AUTORIZACIÓN DE RUTAS PRIVADAS (redirección por rol):
 *     - /taller/*  → personal del taller (owner/advisor/mechanic)
 *     - /admin/*   → administrador de plataforma
 *     - /cuenta/*  → cuenta de cliente
 *     La autorización fina (acciones por rol y aislamiento por taller) se
 *     revalida SIEMPRE en el servidor (lib/auth/guards.ts): nunca se confía
 *     solo en el frontend.
 */
import { NextResponse, NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecret } from "@/lib/auth/secret";

/* ── 1. SEGURIDAD PERIMETRAL ─────────────────────────────────────────────── */

/** User-Agents de herramientas de ataque/escaneo conocidas. */
const BOT_UA_MALICIOSOS = [
  "sqlmap", "nikto", "nmap", "masscan", "dirbuster", "gobuster", "wpscan",
  "acunetix", "nessus", "metasploit", "havij", "headlesschrome", "phantomjs",
  "selenium", "puppeteer", "scrapy", "httrack", "wget", "curl/", "python-requests",
  "go-http-client", "java/", "libwww-perl",
];

/** Fragmentos de ruta que nunca deben servirse (sondeo común). */
const RUTAS_SENSIBLES = [
  ".env", ".git", ".svn", ".hg", ".htaccess", ".htpasswd", "wp-login", "wp-admin",
  "xmlrpc", "phpinfo", "config.php", "admin.php", ".aws", ".ssh", "id_rsa",
  "backup", ".sql", "composer.json", "package.json", ".DS_Store",
];

function esRutaSensible(pathname: string): boolean {
  const p = pathname.toLowerCase();
  return RUTAS_SENSIBLES.some((f) => p.includes(f.toLowerCase()));
}

function esBotMalicioso(userAgent: string): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_UA_MALICIOSOS.some((b) => ua.includes(b));
}

/** Genera un nonce criptográfico (base64) para la CSP de esta petición. */
function generarNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/** Construye la CSP estricta con el nonce de la petición. */
function cspConNonce(nonce: string, allowIframe: boolean): string {
  const frameAncestors = allowIframe ? "frame-ancestors *;" : "frame-ancestors 'self';";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'unsafe-inline'`, // Next.js/React requieren unsafe-eval/unsafe-inline para hidratación y dynamic imports
    "style-src 'self' 'unsafe-inline'", // Tailwind v4 inlinea CSS en el build
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    frameAncestors,
    "upgrade-insecure-requests",
  ].join("; ");
}

/** Aplica todas las cabeceras de seguridad a una respuesta saliente. */
function aplicarHeadersSeguridad(res: NextResponse, nonce: string, allowIframe: boolean): NextResponse {
  const h = res.headers;
  h.set("Content-Security-Policy", cspConNonce(nonce, allowIframe));
  h.set("X-Content-Type-Options", "nosniff");
  if (!allowIframe) h.set("X-Frame-Options", "SAMEORIGIN");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("Cross-Origin-Resource-Policy", "same-origin");
  h.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  h.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()"
  );
  // El nonce viaja como response header para que el layout pueda leerlo via headers()
  h.set("x-csp-nonce", nonce);
  return res;
}

/* ── 2. AUTORIZACIÓN POR ROL ─────────────────────────────────────────────── */

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const allowIframe = process.env.ALLOW_IFRAME_PREVIEW === "1";

  // ── Bloqueos perimetrales (antes de cualquier otra cosa) ──
  if (esRutaSensible(pathname)) {
    return new NextResponse("No encontrado", { status: 404 });
  }
  const ua = req.headers.get("user-agent") ?? "";
  if (esBotMalicioso(ua) && !pathname.startsWith("/api/health")) {
    return new NextResponse("Acceso denegado", { status: 403 });
  }

  // ── Nonce CSP por petición ──
  const nonce = generarNonce();

  // ── Workaround Cloudflare Workers: capturar body en POST a /api/* ──────────
  // En CF Workers el body solo se puede leer una vez. Si el middleware lo lee,
  // creamos un nuevo Request con el body para que la API route lo reciben.
  // Los endpoints multipart/form-data (subida de archivos) NO se tocan: su
  // body es un stream con boundary que no debe reconstruirse como texto.
  let reqConBody = req;
  if (pathname.startsWith("/api/") && req.method === "POST") {
    const contentType = req.headers.get("content-type") ?? "";
    const isMultipart = contentType.startsWith("multipart/form-data");
    if (!isMultipart) {
      try {
        const body = await req.text();
        if (body) {
          reqConBody = new NextRequest(req, { body });
        }
      } catch {
        // Si falla la lectura, continuar con request original
      }
    }
  }

  // ── Verificación de sesión JWT ──
  const token = reqConBody.cookies.get("tc_session")?.value ?? reqConBody.cookies.get("__Host-tc_session")?.value;
  let payload: { rol?: string } | null = null;
  if (token) {
    try {
      const res = await jwtVerify(token, getJwtSecret(), { issuer: "taller-conecta" });
      payload = res.payload as { rol?: string };
    } catch {
      payload = null;
    }
  }

  const esCuentaPrivada =
    pathname === "/cuenta" ||
    (pathname.startsWith("/cuenta/") &&
      !pathname.startsWith("/cuenta/login") &&
      !pathname.startsWith("/cuenta/registro"));

  const needsAuth =
    pathname.startsWith("/taller") || pathname.startsWith("/app") || pathname.startsWith("/admin") || esCuentaPrivada;

  const redirigir = (destino: string) => {
    const url = reqConBody.nextUrl.clone();
    url.pathname = destino;
    url.search = "";
    return aplicarHeadersSeguridad(NextResponse.redirect(url), nonce, allowIframe);
  };

  if (needsAuth && !payload?.rol) {
    if (esCuentaPrivada) return redirigir("/cuenta/login");
    const url = reqConBody.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return redirigir("/login");
  }

  // Encauzar por rol
  if (pathname.startsWith("/cuenta") && payload?.rol && payload.rol !== "customer") {
    return redirigir(payload.rol === "platform_admin" ? "/admin" : "/taller/dashboard");
  }
  if (pathname.startsWith("/admin") && payload?.rol && payload.rol !== "platform_admin") {
    return redirigir(payload.rol === "customer" ? "/cuenta" : "/taller/dashboard");
  }
  if (pathname.startsWith("/taller") && payload?.rol && (payload.rol === "platform_admin" || payload.rol === "customer")) {
    return redirigir(payload.rol === "platform_admin" ? "/admin" : "/cuenta");
  }
  if (pathname.startsWith("/app") && payload?.rol && (payload.rol === "platform_admin" || payload.rol === "customer")) {
    return redirigir(payload.rol === "platform_admin" ? "/admin" : "/cuenta");
  }

  // Respuesta normal con headers de seguridad + nonce disponible para el layout via response headers
  // Usar reqConBody para preservar el body en POST a /api/*
  return aplicarHeadersSeguridad(NextResponse.next({ request: reqConBody }), nonce, allowIframe);
}

export const config = {
  // Todas las rutas salvo assets estáticos y el service worker (headers propios).
  // Incluimos /api para capturar el body en POST requests (workaround Cloudflare Workers).
  matcher: ["/((?!_next/static|_next/image|icons/|logos/|sw\\.js|manifest\\.webmanifest|favicon\\.ico).*)"],
};
