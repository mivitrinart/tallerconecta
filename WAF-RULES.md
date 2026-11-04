# 🛡️ Reglas WAF - Taller Conecta

## Configuración requerida en Cloudflare Dashboard

**Ruta:** Cloudflare Dashboard → Sitio `tallerconecta.co` → Security → WAF → Custom Rules

---

## Regla 1: Bloquear bots de SEO (Block)

| Campo | Valor |
|-------|-------|
| **Nombre** | Bloquear bots de SEO |
| **Campo** | User Agent |
| **Operador** | contains |
| **Valor** | `semrush` |
| **Operador lógico** | OR |
| **Campo 2** | User Agent |
| **Operador 2** | contains |
| **Valor 2** | `ahrefs` |
| **Operador lógico** | OR |
| **Campo 3** | User Agent |
| **Operador 3** | contains |
| **Valor 3** | `mj12bot` |
| **Operador lógico** | OR |
| **Campo 4** | User Agent |
| **Operador 4** | contains |
| **Valor 4** | `dotbot` |
| **Acción** | Block |

---

## Regla 2: Bloquear escaneos (Block)

| Campo | Valor |
|-------|-------|
| **Nombre** | Bloquear escaneos de vulnerabilidades |
| **Campo** | URI Path |
| **Operador** | contains |
| **Valor** | `.env` |
| **Operador lógico** | OR |
| **Campo 2** | URI Path |
| **Operador 2** | contains |
| **Valor 2** | `wp-login` |
| **Operador lógico** | OR |
| **Campo 3** | URI Path |
| **Operador 3** | contains |
| **Valor 3** | `xmlrpc` |
| **Operador lógico** | OR |
| **Campo 4** | URI Path |
| **Operador 4** | contains |
| **Valor 4** | `.git` |
| **Acción** | Block |

---

## Regla 3: Bloquear herramientas de hacking (Block)

| Campo | Valor |
|-------|-------|
| **Nombre** | Bloquear herramientas de hacking |
| **Campo** | User Agent |
| **Operador** | contains |
| **Valor** | `sqlmap` |
| **Operador lógico** | OR |
| **Campo 2** | User Agent |
| **Operador 2** | contains |
| **Valor 2** | `nikto` |
| **Operador lógico** | OR |
| **Campo 3** | User Agent |
| **Operador 3** | contains |
| **Valor 3** | `nmap` |
| **Operador lógico** | OR |
| **Campo 4** | User Agent |
| **Operador 4** | contains |
| **Valor 4** | `masscan` |
| **Acción** | Block |

---

## Regla 4: Bloquear scrapers agresivos (Managed Challenge)

| Campo | Valor |
|-------|-------|
| **Nombre** | Bloquear scrapers automatizados |
| **Campo** | User Agent |
| **Operador** | contains |
| **Valor** | `python-requests` |
| **Operador lógico** | OR |
| **Campo 2** | User Agent |
| **Operador 2** | contains |
| **Valor 2** | `go-http-client` |
| **Operador lógico** | OR |
| **Campo 3** | User Agent |
| **Operador 3** | contains |
| **Valor 3** | `curl` |
| **Acción** | Managed Challenge |

---

## Regla 5: Rate limiting por IP (Managed Challenge)

| Campo | Valor |
|-------|-------|
| **Nombre** | Rate limiting por IP |
| **Campo** | IP |
| **Operador** | equals |
| **Valor** | (dejar vacío para aplicar a todas) |
| **Rate limit** | 100 solicitudes por 10 segundos |
| **Acción** | Managed Challenge |

---

## Reglas adicionales recomendadas (si tienes créditos)

| Regla | Acción | Justificación |
|-------|--------|---------------|
| Bloquear países no objetivo | Block | Si solo opera en Colombia, bloquear otros países |
| Bloquear Tor | Block | Nodos de salida de Tor |
| Challenge a navegadores sin JS | Managed Challenge | Bots simples que no ejecutan JS |

---

## Verificación de reglas

Después de crear las reglas, verifica que estén activas:

1. Ve a **Security → WAF → Custom Rules**
2. Verifica que las 5 reglas estén en estado **"Enabled"**
3. El orden de prioridad: Regla 1-4 (bloqueo directo), Regla 5 (rate limiting)

---

## Métricas para monitorear

En **Security → Events**, revisa:

- Bloqueos por regla de WAF
- Challenges resueltos/no resueltos
- IPs con más requests (para ajustar rate limit)

---

## Notas importantes

1. **Orden de prioridad:** Las reglas se evalúan en orden. La regla 5 (rate limit) debe ir al final.
2. **Falsos positivos:** Si algún usuario legítimo es bloqueado, revisa los eventos en Security → Events y ajusta las reglas.
3. **CAPTCHA:** Los "Managed Challenge" muestran un CAPTCHA al usuario antes de permitir el acceso.
4. **No bloquees Googlebot:** No agregues Googlebot a las listas de bloqueo, afectaría tu SEO.
