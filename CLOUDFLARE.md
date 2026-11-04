# Cloudflare Architecture — Taller Conecta

> Documento vivo: actualízalo en cada cambio de infraestructura.

---

## 1. Tipo de aplicación
**Next.js 16.4.5** desplegado en **Cloudflare Workers** mediante **OpenNext** (`@opennextjs/cloudflare@1.20.15`).

- Output: `output: "standalone"` → OpenNext empaqueta el runtime de Next.js, middleware, assets estáticos y APIs en un solo Worker.
- Compatibilidad: `compatibility_date = "2026-10-28"`, `nodejs_compat` habilitado.

---

## 2. Bindings / Recursos

| Binding | Tipo | Uso | Configuración |
|---------|------|-----|---------------|
| `ASSETS` | `assets` | Archivos estáticos de Next.js (`.open-next/assets`) | `directory = ".open-next/assets"` |
| `taller_conecta_db` | `d1_database` | Base de datos principal (23 tablas, 416 KB) | `database_id = "9819e31e-30d5-466d-afa3-d28e536de6a6"` |
| `RATE_LIMIT_KV` | `kv_namespace` | Rate limiting de peticiones | `id = "3c38c764565c4429b4b453d7d31419f4"` |
| `ISR_CACHE` | `durable_object` | Caché incremental (ISR) para páginas estáticas | `class_name = "ISRCache"`, migración `v1` |
| `EVIDENCIAS_BUCKET` | `r2_bucket` | *(Comentado)* Evidencias fotográficas | Pendiente crear bucket en dashboard |

### Secrets (no commiteados — `wrangler secret put`)
| Secret | Descripción |
|--------|-------------|
| `AUTH_SECRET` | Clave maestra de autenticación (NextAuth/Auth.js) |
| `JWT_SECRET` | Firma de tokens JWT de sesión |
| `SMTP_API_KEY` | API key de Mailtrap (testing) |

### Vars de entorno (commiteadas en `wrangler.toml` / `wrangler.jsonc`)
```toml
SMTP_API_URL = "https://api.mailtrap.io/api/send"
SMTP_FROM = "Taller Conecta <no-reply@tallerconecta.co>"
SMTP_HOST = "smtp.mailtrap.io"
SMTP_PORT = "587"
```

---

## 3. Triggers

| Trigger | Estado | Detalle |
|---------|--------|---------|
| HTTP requests | ✅ Activo | Único trigger actual — todas las rutas de Next.js |
| Cron triggers | ❌ Ninguno | **Recomendado**: añadir para limpieza, recordatorios, sync-plan |
| Queues | ❌ Ninguna | Futuro: emails async, webhooks, procesamiento batch |
| Durable Objects | ✅ 1 (`ISRCache`) | Caché ISR; listo para más (rate limiting distribuido, colas) |

---

## 4. Dominios y rutas

| Configuración | Estado |
|---------------|--------|
| `workers.dev` subdomain | ✅ Habilitado (`tallerconecta.<subdomain>.workers.dev`) |
| Custom routes | ❌ Ninguna |
| Custom domain (`tallerconecta.co`) | ❌ **Pendiente** — configurar en dashboard Pages/Workers |

> **Acción**: Si posees `tallerconecta.co`, añádelo como custom domain en el dashboard del Worker o Pages. Actualiza `SMTP_FROM` y cookies `__Host-` para que coincidan.

---

## 5. Tráfico y salud (últimas 24h)

| Métrica | Valor |
|---------|-------|
| Peticiones totales | 3,278 |
| Errores | 18 (0.55%) |
| Pico | 661 req a las 23:00 UTC (5 nov) |
| Ventanas de error | 03:00 UTC (7), 05:00 UTC (11) — **coinciden con deployments** |

> **Interpretación**: errores transitorios durante actualizaciones (cold starts, race conditions de bindings). Revisar logs en esas horas.

---

## 6. Deployments

- **Total**: 133 versiones (todas por `jpixx27@gmail.com`)
- **Últimas 3h**: 10 deployments (alta rotación)
- **Método**: 95% `wrangler deploy`, 5% API (actualización de secrets)
- **Estrategia**: 100% traffic inmediato (sin canary/gradual)

> **Recomendación**: habilitar gradual rollout (percentage < 100%) para detectar regresiones antes de afectar a todos.

---

## 7. Base de datos D1

| Propiedad | Valor |
|-----------|-------|
| Nombre | `taller-conecta-db` |
| Tablas | 23 |
| Tamaño | 416 KB |
| Creada | 2026-10-27 (10 días) |
| Región | `ENAM` (Este Norteamérica) |
| Read replication | ❌ **Deshabilitada** |

> **Recomendación**: habilitar read replication cuando el tráfico de lectura crezca (mejora latencia y disponibilidad).
>
> **Cómo habilitar**:
> 1. Dashboard → D1 → `taller-conecta-db` → Settings
> 2. Activar "Read replication" (requiere plan Workers Paid)
> 3. Cloudflare crea réplicas de lectura automáticamente en regiones cercanas a los usuarios
> 4. Las consultas `SELECT` se enrutan a la réplica más cercana; escrituras van al primario
> 5. Verificar en `wrangler d1 info taller-conecta-db` que `read_replication = true`

---

## 8. Observabilidad

| Feature | Estado | Configuración |
|---------|--------|---------------|
| Logs | ✅ Habilitado | `head_sampling_rate = 1` (100%) |
| Traces | ❌ Deshabilitadas | — |
| Logpush | ❌ Deshabilitado | — |
| Log retention | Default | Considerar exportar a R2/S3 para retención larga |

> **Recomendación**: habilitar **Traces** para visibilidad end-to-end (latencia por ruta, DB, KV, DO).
>
> **Cómo habilitar Traces**:
> 1. Dashboard → Workers → `tallerconecta` → Observability → Traces
> 2. Activar "Enable traces" con sampling rate 10-20% (para producción)
> 3. Las traces capturan: latencia por ruta, tiempo en D1/KV/DO, cold starts, errores
> 4. Ver en Dashboard → Traces → Service map / Trace timeline
> 5. Para debugging local: `wrangler tail --format=json | jq '.trace'`
>
> **Logpush (recomendado)**:
> 1. Crear bucket R2 `tallerconecta-logs` (o usar bucket existente)
> 2. Dashboard → Workers → Logs → Logpush → Create job
> 3. Destination: R2 → bucket `tallerconecta-logs` → path `workers/{DATE}/{TIME}.jsonl`
> 3. Permite retención ilimitada, queries SQL via Athena/Trino, alertas custom

---

## 9. Observaciones y plan de acción

### 🔴 Crítico (producción)
1. **Mailtrap en producción** — Los correos no llegan a destinatarios reales.
   - **Acción**: Migrar a **Resend**, **SendGrid** o **Amazon SES**.
   - Actualizar `SMTP_API_KEY`, `SMTP_API_URL`, `SMTP_HOST`, `SMTP_FROM` con credenciales del nuevo proveedor.
   - Verificar DKIM/SPF/DMARC para `tallerconecta.co`.

   **Guía rápida Resend (recomendado por simplicidad)**:
   1. Crear cuenta en resend.com → verificar dominio `tallerconecta.co`
   2. DNS: añadir registros DKIM/SPF/DMARC que Resend provee
   3. Crear API key en Resend → `re_...`
   4. Actualizar secrets:
      ```bash
      npx wrangler secret put SMTP_API_KEY   # valor: re_...
      npx wrangler secret put SMTP_API_URL   # valor: https://api.resend.com
      npx wrangler secret put SMTP_HOST      # valor: smtp.resend.com
      npx wrangler secret put SMTP_PORT      # valor: 587
      npx wrangler secret put SMTP_FROM      # valor: Taller Conecta <no-reply@tallerconecta.co>
      ```
   5. Verificar en `lib/auth/session.ts` y `lib/notify/index.ts` que usan `env.SMTP_*` correctamente
   6. Test: `curl -X POST /api/auth/registro-con-codigo` → revisar bandeja real

   **Alternativa SendGrid**: similar, pero requiere validación de sender identity y plantillas.
   **Alternativa Amazon SES**: más barato a volumen, pero requiere sandbox exit y manejo de bounces/complaints.

2. **Custom domain ausente** — `tallerconecta.co` no está vinculado.
   - **Acción**: En dashboard → Worker → Settings → Triggers → Custom Domains → `tallerconecta.co` + `www.tallerconecta.co`.
   - Asegurar certificado TLS válido y HSTS.

### 🟡 Importante (escalabilidad)
3. **Read replication D1 deshabilitada** — Latencia de lectura subóptima bajo carga.
   - **Acción**: En dashboard D1 → Settings → Enable read replication (requiere plan pagado).

4. **Sin cron triggers** — Tareas programadas inexistentes.
   - **Acción**: Añadir crons para:
     - `caducarSuscripcionesVencidas` (diario 03:00 UTC)
     - Recordatorios de mantenimiento (diario 04:00 UTC)
     - Limpieza de sesiones expiradas (cada hora)
     - Sync de planes / auditoría (cada 15 min)

5. **Traces deshabilitadas** — Ciega a latencias end-to-end.
   - **Acción**: En dashboard → Observability → Traces → Enable (sampling 10-20% inicial).

### 🟢 Mejora continua
6. **Despliegues graduales** — 100% inmediato arriesga regresiones.
   - **Acción**: `wrangler deploy --percentage 10` → monitorear → `wrangler deploy --percentage 100`.

7. **Logpush a R2/S3** — Retención y análisis histórico.
   - **Acción**: Configurar Logpush → R2 bucket `tallerconecta-logs`.

8. **Durable Objects adicionales** — Rate limiting distribuido, colas ligeras, presencia.
   - Ya tienes `ISRCache`; extender según necesidad.

---

## 10. Comandos útiles

```bash
# Desarrollo local
npm run dev                    # next dev + wrangler dev (requiere .dev.vars)

# Deploy
npm run build                  # next build + opennextjs-cloudflare build
npm run deploy                 # build + wrangler deploy

# Secrets (nunca en .toml/.jsonc)
npx wrangler secret put AUTH_SECRET
npx wrangler secret put JWT_SECRET
npx wrangler secret put SMTP_API_KEY

# Logs en vivo
npx wrangler tail --format=pretty

# D1
npx wrangler d1 execute taller-conecta-db --command="SELECT * FROM workshops"
npx wrangler d1 backup create taller-conecta-db

# KV
npx wrangler kv:namespace list
npx wrangler kv:key get --namespace-id=... "rate_limit:ip"

# Durable Objects
npx wrangler durable-object list ISRCache
```

---

## 11. Estructura de archivos de infra

```
├── wrangler.toml              # Config principal (TOML)
├── wrangler.jsonc             # Config principal (JSONC) — espejo
├── open-next.config.ts        # Config OpenNext (ISR, DO, cache)
├── tsconfig.json              # TypeScript (excluye .open-next)
├── cloudflare-env.d.ts        # Tipos de bindings Cloudflare
├── .dev.vars                  # Secrets locales (gitignored)
├── .env                       # Vars locales (gitignored)
├── components/durable-objects/ISRCache.ts  # DO para caché ISR
└── app/api/taller/sync-plan/route.ts       # Endpoint cron-target
```

---

## 12. Changelog de infra

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2026-11-06 | Durable Object `ISRCache` para ISR cache | Kilo |
| 2026-11-06 | Página raíz estática (`force-static`) + SessionGate | Kilo |
| 2026-11-06 | `caducarSuscripcionesVencidas()` llamado en configuración | Kilo |
| 2026-11-06 | Excluir `.open-next` de `tsconfig.json` | Kilo |
| 2026-11-06 | **Este documento creado** | Kilo |

> Mantén este archivo actualizado en cada PR que toque infraestructura.