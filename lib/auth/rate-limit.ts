/**
 * Limitador de intentos en memoria (memoria del proceso).
 * En producción multi-instancia se debería usar Redis/Upstash.
 * Máximo 10 intentos por minuto por IP para rutas sensibles.
 */
interface RegistroIntento {
  marcas: number[];
  bloqueadoHasta: number;
}

const intentos = new Map<string, RegistroIntento>();
const LIMITE = 10;
const VENTANA_MS = 60 * 1000; // 1 minuto
const BLOQUEO_MS = 15 * 60 * 1000; // 15 minutos de bloqueo al superar el límite

function clave(ip: string, ruta: string): string {
  return `${ip}:${ruta}`;
}

export function registrarIntento(ip: string, ruta: string): { permitido: boolean; restante: number; retryAfter?: number } {
  const ahora = Date.now();
  const key = clave(ip, ruta);
  let reg = intentos.get(key);
  if (!reg) {
    reg = { marcas: [], bloqueadoHasta: 0 };
    intentos.set(key, reg);
  }
  // Limpiar marcas fuera de la ventana
  reg.marcas = reg.marcas.filter((m) => ahora - m < VENTANA_MS);

  if (ahora < reg.bloqueadoHasta) {
    return { permitido: false, restante: 0, retryAfter: Math.ceil((reg.bloqueadoHasta - ahora) / 1000) };
  }

  if (reg.marcas.length >= LIMITE) {
    reg.bloqueadoHasta = ahora + BLOQUEO_MS;
    reg.marcas = [];
    return { permitido: false, restante: 0, retryAfter: Math.ceil(BLOQUEO_MS / 1000) };
  }

  reg.marcas.push(ahora);
  return { permitido: true, restante: LIMITE - reg.marcas.length };
}

export function obtenerIp(req: { headers: { get: (name: string) => string | null } }): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xrip = req.headers.get("x-real-ip");
  if (xrip) return xrip;
  return "desconocida";
}

export function validarOrigin(req: { headers: { get: (name: string) => string | null } }, host: string): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // navegadores de mismo origen o herramientas sin Origin
  try {
    const origenUrl = new URL(origin);
    const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const headerHost = req.headers.get("host")?.trim();
    return (
      origenUrl.host === host ||
      (Boolean(forwardedHost) && origenUrl.host === forwardedHost) ||
      (Boolean(headerHost) && origenUrl.host === headerHost)
    );
  } catch {
    return false;
  }
}
