# 🚀 Configuración de Seguridad - Taller Conecta

## Resumen de implementación

Se han implementado las siguientes capas de seguridad:

| Capa | Archivo | Estado |
|------|---------|--------|
| WAF (Cloudflare Dashboard) | `WAF-RULES.md` | ⏳ Pendiente (configurar manualmente) |
| CSP estricto con nonce por petición + HSTS/COOP/CORP | `middleware.ts` + `next.config.mjs` | ✅ Implementado |
| Bloqueo de bots y rutas sensibles en el edge | `middleware.ts` | ✅ Implementado |
| Rate limiting doble (memoria + D1 persistente) | `lib/auth/rate-limit.ts`, `lib/auth/rate-limit-d1.ts` | ✅ Implementado |
| Cookie de sesión endurecida (`__Host-`, Secure, 12 h) | `lib/auth/session.ts` | ✅ Implementado |
| Anti-CSRF (validación de Origin) y honeypot | `lib/auth/rate-limit.ts` + rutas auth | ✅ Implementado |
| RLS forzado + auditoría PL/pgSQL + anti-escalada | `supabase/migrations/0008_security_hardening.sql` | ✅ Implementado |
| Auditoría automática del repo (secretos, CSP) | `scripts/security/audit_security.py` | ✅ Implementado |
| Verificación pre-despliegue Cloudflare | `scripts/deploy/verify_cloudflare.py` | ✅ Implementado |
| Secretos fuera del repo (`wrangler secret`) | `wrangler.toml` (sin credenciales) | ✅ Implementado |
| Caché de assets estáticos | `wrangler.toml` | ✅ Configurado |

---

## 1️⃣ Reglas WAF en Cloudflare Dashboard

**Ubicación:** Cloudflare Dashboard → tallerconecta.co → Security → WAF → Custom Rules

| # | Nombre | Acción | Prioridad |
|---|--------|--------|-----------|
| 1 | Bloquear bots de SEO | Block | 1 |
| 2 | Bloquear escaneos | Block | 2 |
| 3 | Bloquear herramientas de hacking | Block | 3 |
| 4 | Bloquear scrapers agresivos | Managed Challenge | 4 |
| 5 | Rate limiting por IP | Managed Challenge | 5 |

**Ver archivo:** `WAF-RULES.md` para detalles completos de cada regla.

---

## 2️⃣ Middleware de seguridad (implementado)

Archivo: `lib/security/middleware.ts`

Este middleware se ejecuta en el Worker y proporciona:

- ✅ Bloqueo de User-Agents maliciosos (semrush, ahrefs, sqlmap, etc.)
- ✅ Bloqueo de acceso a rutas sensibles (.env, .git, wp-login, etc.)
- ✅ Rate limiting en rutas de login/registro (100 req/10s por IP)
- ✅ Headers de seguridad (X-Content-Type-Options, X-Frame-Options, HSTS, etc.)
- ✅ Respuesta 403/404/429 según el tipo de bloqueo

**Estado:** Implementado y desplegado en el Worker.

---

## 3️⃣ Caché de assets estáticos

Archivo: `wrangler.toml`

Se configuraron reglas de caché para:

| Ruta | TTL | Acción |
|------|-----|--------|
| `/_next/static/*` | 1 año | Cachear |
| `/logos/*` | 1 año | Cachear |
| `/icons/*` | 1 año | Cachear |
| `/api/*` | 0s | No cachear |
| `/taller/*` | 0s | No cachear |
| `/cuenta/*` | 0s | No cachear |

**Estado:** Configurado y desplegado.

---

## 4️⃣ Cómo aplicar las reglas WAF

1. Inicia sesión en [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Selecciona tu dominio `tallerconecta.co`
3. Ve a **Security** → **WAF** → **Custom Rules**
4. Crea cada regla siguiendo la documentación en `WAF-RULES.md`
5. Verifica que todas las reglas estén en estado **Enabled**

---

## 5️⃣ Verificación de implementación

Después de aplicar las reglas WAF, verifica:

1. **Health check:** https://tallerconecta.jpixx27.workers.dev/api/health
   - Debe retornar: `{"ok":true,"status":"healthy","mode":"d1"}`

2. **Prueba de bloqueo de bots:** Intenta acceder con un User-Agent como `curl` o `python-requests` a una ruta protegida y debería retornar 403.

3. **Prueba de rate limiting:** Intenta hacer más de 100 requests en 10 segundos a `/api/cuenta/login` y debería retornar 429.

4. **Prueba de rutas sensibles:** Intenta acceder a `/.env` o `/.git` y debería retornar 404.

---

## 6️⃣ Monitoreo

Revisa periódicamente en Cloudflare Dashboard:

- **Security → Events:** Ver bloqueos y desafíos
- **Security → Events → Rules:** Ver qué reglas están activando más bloqueos
- **Analytics → Security:** Ver tráfico bloqueado vs legítimo

---

## Archivos modificados/creados

| Archivo | Acción |
|---------|--------|
| `wrangler.toml` | Configuración de caché y reglas de ruta |
| `lib/security/middleware.ts` | Middleware de seguridad (nuevo) |
| `WAF-RULES.md` | Documentación de reglas WAF (nuevo) |

---

## Estado actual del despliegue

- **Worker URL:** https://tallerconecta.jpixx27.workers.dev
- **Estado:** Desplegado y operativo
- **Base de datos:** D1 (taller-conecta-db) conectada con datos de semilla
- **Typecheck:** Pasa limpio
- **Build:** Pasa con OpenNext + Webpack

---

## Próximos pasos recomendados

1. ✅ Configurar las 5 reglas WAF en Cloudflare Dashboard
2. ⬜ Configurar dominio personalizado `tallerconecta.co` en Cloudflare Dashboard
3. ⬜ Monitorear Security → Events durante la primera semana
4. ⬜ Ajustar umbrales de rate limiting según tráfico real
5. ⬜ Considerar agregar MFA para cuentas de administrador

---

## 🛡️ Hardening aplicado (sesión actual)

- **CSP con nonce criptográfico por petición** inyectado en `middleware.ts`
  (sin `unsafe-eval`); cabeceras OWASP completas en todas las respuestas.
- **Cookie `__Host-tc_session`**: HttpOnly, Secure, SameSite=Lax, 12 h de vida;
  JWT HS256 con `issuer` + `audience` verificados.
- **Rate limiting persistente en D1** (`rate_limit_events`, SQL parametrizado):
  10 intentos/minuto por IP+ruta en login, compartido entre todas las réplicas.
- **PL/pgSQL (migración 0008)**: `FORCE ROW LEVEL SECURITY`, trigger de auditoría
  en tablas sensibles, bloqueo de escalada al rol `owner`, permisos mínimos,
  vista de usuarios sin hashes, índices de seguridad.
- **Secretos eliminados del repo**: `wrangler.toml`/`wrangler.jsonc` ya no
  exponen credenciales SMTP. Usar `npx wrangler secret put SMTP_API_KEY` y
  `npx wrangler secret put AUTH_SECRET` (obligatorio; sin él, login/registro
  devuelven 500 en producción).
- **Verificación con Python antes de desplegar**:
  `python3 scripts/security/audit_security.py` y
  `python3 scripts/deploy/verify_cloudflare.py`.
