/**
 * Middleware de seguridad - Taller Conecta
 * Capa adicional de protección contra bots y ataques automatizados
 * Se ejecuta en el Worker de Cloudflare antes de llegar a la aplicación
 */

// Lista de User-Agents de bots maliciosos a bloquear
const BOT_USER_AGENTS = [
  'semrush',
  'ahrefs',
  'mj12bot',
  'dotbot',
  'sqlmap',
  'nikto',
  'nmap',
  'masscan',
  'python-requests',
  'go-http-client',
  'curl',
  'wget',
  'httrack',
  'scrapy',
  'headlesschrome',
  'phantomjs',
  'selenium',
];

// Rutas sensibles que no deben ser accesibles
const SENSITIVE_PATHS = [
  '.env',
  '.env.',
  'wp-login',
  'wp-admin',
  'xmlrpc',
  '.git',
  '.svn',
  '.htaccess',
  '.htpasswd',
  'config.php',
  'admin.php',
  'phpinfo',
];

// Rutas que requieren rate limiting estricto
const RATE_LIMITED_PATHS = [
  '/api/cuenta/login',
  '/api/cuenta/registro',
  '/api/auth/login',
  '/api/registro',
];

// Almacenamiento en memoria para rate limiting simple
// Nota: En producción usa KV o una base de datos externa para persistir entre instancias
const rateLimitStore = new Map();

const RATE_LIMIT_WINDOW = 10 * 1000; // 10 segundos
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests por ventana

/**
 * Verifica si el User-Agent es de un bot malicioso
 */
function isMaliciousBot(userAgent: string): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some(bot => ua.includes(bot.toLowerCase()));
}

/**
 * Verifica si la ruta es sensible (debería estar bloqueada)
 */
function isSensitivePath(path: string): boolean {
  const lowerPath = path.toLowerCase();
  return SENSITIVE_PATHS.some(pattern => lowerPath.includes(pattern.toLowerCase()));
}

/**
 * Verifica si la ruta requiere rate limiting
 */
function isRateLimitedPath(path: string): boolean {
  return RATE_LIMITED_PATHS.some(route => path.startsWith(route));
}

/**
 * Verifica el rate limiting por IP
 */
function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Limpiar entradas antiguas
  const requests = rateLimitStore.get(ip) || [];
  const validRequests = requests.filter((timestamp: number) => timestamp > windowStart);
  
  if (validRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }
  
  validRequests.push(now);
  rateLimitStore.set(ip, validRequests);
  
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - validRequests.length };
}

/**
 * Middleware principal de seguridad
 */
export async function securityMiddleware(
  request: Request,
  env: any,
  next: () => Promise<Response>
): Promise<Response> {
  const url = new URL(request.url);
  const userAgent = request.headers.get('User-Agent') || '';
  const ip = request.headers.get('CF-Connecting-IP') || 
               request.headers.get('X-Forwarded-For') || 
               'unknown';
  
  // 1. Verificar honeypot: si acceden a /admin o rutas admin sin autenticación
  if (url.pathname.startsWith('/admin') && !request.headers.get('Cookie')) {
    // Permitir acceso a la página de login de admin
    if (!url.pathname.includes('/login')) {
      return new Response(JSON.stringify({ error: 'Acceso denegado' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // 2. Bloquear bots maliciosos
  if (isMaliciousBot(userAgent)) {
    return new Response(
      JSON.stringify({ error: 'Acceso denegado: bot detectado' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 3. Bloquear acceso a rutas sensibles
  if (isSensitivePath(url.pathname)) {
    return new Response(
      JSON.stringify({ error: 'Recurso no encontrado' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // 4. Rate limiting en rutas sensibles (login, registro)
  if (isRateLimitedPath(url.pathname) && request.method === 'POST') {
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Demasiadas solicitudes. Intenta de nuevo en 10 segundos.',
          retryAfter: 10 
        }),
        {
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': '10',
          },
        }
      );
    }
  }

  // 5. Agregar headers de seguridad
  const response = await next();
  
  // Headers de seguridad estándar
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // HSTS solo en producción (HTTPS)
  if (url.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  return response;
}

export default securityMiddleware;
