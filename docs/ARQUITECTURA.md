# Arquitectura y despliegue — TallerConecta

Aplicativo web full-stack desplegado en **Cloudflare** (Workers + Pages vía OpenNext + D1).

## Stack tecnológico

| Capa | Tecnología | Ubicación |
|------|-----------|-----------|
| Frontend / SSR | Next.js 16 (App Router) + React 19 + **TypeScript** | `app/`, `components/` |
| Estilos | **CSS** con Tailwind CSS v4 (sistema de diseño en `app/globals.css`) | `app/globals.css` |
| API | Route Handlers de Next (edge) con validación **Zod** | `app/api/` |
| Base de datos | Cloudflare **D1** (SQLite en el edge) + esquema **PL/pgSQL** para Supabase/Postgres | `schema.sql`, `supabase/migrations/` |
| Auth | JWT (HS256, `jose`) en cookie `__Host-tc_session` (HttpOnly, Secure, SameSite) | `lib/auth/` |
| Automatización / auditoría | **Python** (auditoría de seguridad y verificación pre-despliegue) | `scripts/security/`, `scripts/deploy/` |
| Despliegue | Cloudflare Workers vía `@opennextjs/cloudflare` + `wrangler` | `wrangler.toml` |

## Estructura de carpetas (organizada por responsabilidad)

```
app/                  # Rutas de Next (App Router), agrupadas por audiencia
  (publico)/          #   Landing, precios y registro públicos
  (auth)/             #   Login y recuperación de acceso
  taller/             #   Panel del taller (sidebar: Operación / Gestión / Administración)
  cuenta/             #   Portal del cliente
  admin/              #   Administración de la plataforma
  api/                #   API REST (una carpeta por recurso)
  legal/              #   Documentos legales
components/           # Componentes por dominio + ui/ (primitivas compartidas) + shared/
lib/
  auth/               # sesión JWT, contraseñas, rate limiting (memoria + D1), sanitización
  security/           # middleware de seguridad perimetral
  database/           # capa de datos (D1 store, queries, tipos)
  validations/        # esquemas Zod de toda la API
  permissions/        # roles y permisos
  orders/             # máquina de estados de órdenes
scripts/
  security/           # audit_security.py  (escaneo de secretos y CSP)
  deploy/             # verify_cloudflare.py (checks pre-despliegue)
supabase/migrations/  # Esquema PL/pgSQL: RLS, auditoría, hardening (0008)
```

## Sistema de diseño

Toda la identidad visual vive en `app/globals.css`, organizado en 7 secciones:
tokens de color (paleta azul `#043699` + blanco + negro + semáforo funcional),
capa base, primitivas (`btn-*`, `card`, `input`, `badge`, `page-header`),
patrones (`panel`, `stat`, `chip`), estados, contenido legal y movimiento.
Las páginas internas usan la primitiva `PageHeader` (`components/ui`) para
encabezados consistentes.

## Seguridad (resumen ejecutivo)

1. **Perímetro (edge)**: CSP estricto con nonce por petición, HSTS preload,
   COOP/CORP, `X-Frame-Options`, bloqueo de bots y rutas sensibles (`middleware.ts`).
2. **Sesión**: JWT HS256 con issuer/audience, cookie `__Host-` HttpOnly+Secure,
   expiración 12 h; autorización por rol en middleware y revalidada en servidor.
3. **Anti abuso**: rate limiting doble (memoria por isolate + **D1 persistente**
   compartido entre réplicas), validación de Origin (anti-CSRF), honeypot.
4. **Datos**: consultas siempre parametrizadas; RLS forzado en Postgres con
   auditoría automática (trigger PL/pgSQL), anti-escalada de rol `owner`,
   permisos mínimos por rol (`supabase/migrations/0008_security_hardening.sql`).
5. **Secretos**: nunca en el repo — `wrangler secret put` (ver SECURITY-SETUP.md).
6. **Verificación continua**: `python3 scripts/security/audit_security.py` y
   `python3 scripts/deploy/verify_cloudflare.py` antes de cada despliegue.

## Despliegue en Cloudflare

```bash
# 1. Verificar que no haya secretos en el repo ni CSP débil
python3 scripts/security/audit_security.py
python3 scripts/deploy/verify_cloudflare.py

# 2. Secretos (una sola vez, nunca en archivos commiteados)
npx wrangler secret put SMTP_API_KEY
npx wrangler secret put AUTH_SECRET       # OBLIGATORIO: firma de sesiones JWT (sin esto, login da 500)

# 3. Base de datos D1 (si es primera vez)
npx wrangler d1 execute taller-conecta-db --remote --file=schema.sql

# 3b. Migración de seguridad sobre BD existente (quita FKs inválidas de
#     decided_by/actor_id que impedían guardar aprobaciones de clientes):
npx wrangler d1 execute taller-conecta-db --remote --file=scripts/migrate-d1-actor-fk.sql

# 4. Build + deploy
npm run deploy        # opennextjs-cloudflare build && wrangler deploy
```
