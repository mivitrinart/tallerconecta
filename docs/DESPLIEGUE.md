# 🚀 Desplegar Taller Conecta con HTTPS — paso a paso

Necesitas una URL pública con HTTPS para: instalar la PWA en el celular, generar el **APK** con
Bubblewrap ([ver guía](COMO-GENERAR-APK.md)) y hacer pilotos con talleres reales.

El proyecto ya incluye todo lo necesario: `Dockerfile`, `render.yaml`, health check en `/api/health`
y escucha en el puerto dinámico que asignan las plataformas (`PORT`).

---

## Paso 0 · Sube el proyecto a GitHub (requisito para Railway y Render)

En Windows instala [Git](https://git-scm.com/download/win) y, en la carpeta del proyecto:

```bash
cd taller-conecta
git init
git add .
git commit -m "Taller Conecta MVP"
```

Crea un repositorio nuevo en https://github.com/new (privado o público) y conecta:

```bash
git branch -M main
git remote add origin https://github.com/TU-USUARIO/taller-conecta.git
git push -u origin main
```

> `node_modules/`, `.next/` y `.data/` ya están en `.gitignore`: no se suben (la plataforma los regenera).

---

## Opción A · Railway — RECOMENDADA (datos demo persistentes)

Railway da **crédito gratis de 5 USD** y permite montar un **volumen persistente**, que es lo que el
modo demo necesita (escribe en `.data/db.json`).

1. Entra a https://railway.app → *Login with GitHub*.
2. **New Project → Deploy from GitHub repo** → elige `taller-conecta`.
3. Detecta el `Dockerfile` y construye solo (2-4 min).
4. **Añade el volumen** (la clave para no perder datos):
   servicio → pestaña derecha → **Volumes → Add Volume** → Mount path: `/app/.data`.
   (Railway redeploya automáticamente.)
5. Variables de entorno (pestaña **Variables**):
   - `AUTH_SECRET` = una frase larga al azar (ej. la salida de un generador de contraseñas).
   - Las demás ya tienen valores por defecto correctos.
6. **Settings → Networking → Generate Domain** → te da una URL tipo
   `https://taller-conecta-production.up.railway.app` ✅ **ese es tu dominio HTTPS**.
7. Verifica: abre `https://TU-DOMINIO/api/health` → debe responder `{"ok":true,...}`.

💰 Tras el crédito de 5 USD, el plan Hobby cuesta ~5 USD/mes (suficiente para el MVP).

---

## Opción B · Render — gratis (con una limitación que debes conocer)

1. Entra a https://render.com → *GitHub* → **New → Blueprint** (usa el `render.yaml` del repo)
   o **New → Web Service** y selecciona el repositorio (detecta el Dockerfile).
2. Plan: **Free**. El `AUTH_SECRET` se genera solo (viene en el blueprint).
3. Al terminar te da `https://taller-conecta-xxxx.onrender.com`.
4. Verifica `/api/health`.

⚠️ **Limitación del plan gratis**: el disco es efímero — los datos demo se reinician en cada
deploy/reinicio, y el servicio se duerme tras 15 min sin visitas (la primera visita tarda ~50 s en
despertarlo). Sirve para demos cortas; para un piloto usa Railway (opción A).

---

## Opción C · Sin desplegar: APK de prueba HOY desde tu PC (túnel gratuito)

Si solo quieres **generar el APK ya** para probarlo en tu celular, sin crear cuentas de hosting:

1. Terminal 1 — arranca la app:
   ```bash
   cd taller-conecta
   npm install        # primera vez
   npm run build
   npm run start
   ```
   (En PC con poca RAM: `npm run build -- --webpack`.)
2. Terminal 2 — túnel HTTPS gratuito con Cloudflare:
   - Descarga `cloudflared.exe`: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
   - Ejecuta:
     ```bash
     cloudflared.exe tunnel --url http://localhost:3000
     ```
   - Imprime una URL tipo `https://palabras-al-azar.trycloudflare.com` → **esa es tu URL HTTPS temporal**.
   - Alternativa: `ngrok http 3000`.
3. Verifica `https://TU-TUNEL/api/health` y `/manifest.webmanifest`.
4. Genera el APK con esa URL ([guía completa](COMO-GENERAR-APK.md)):
   ```bash
   npm install -g @bubblewrap/cli
   bubblewrap init --manifest=https://TU-TUNEL/manifest.webmanifest
   bubblewrap build
   ```
   → `app-release-signed.apk`: cópialo al celular e instálalo.

⚠️ La URL del túnel rápido **cambia cada vez que lo reinicias**: perfecta para probar el APK hoy,
no para publicar. Para la versión final usa el dominio estable de la Opción A o B y repite
`bubblewrap init/build` con ese dominio.

---

## Después del despliegue

- **Celular**: abre la URL en Chrome → ⋮ → **“Instalar aplicación”** (PWA inmediata, sin APK).
- **APK/AAB**: sigue [docs/COMO-GENERAR-APK.md](COMO-GENERAR-APK.md) con tu dominio definitivo.
- **Datos del piloto**: en modo demo todo vive en `.data/db.json` del servidor (volumen en Railway).
  Descárgalo de vez en cuando como respaldo. Para producción multi-taller real, el siguiente paso es
  conectar **Supabase** (`DATA_MODE=supabase` + `supabase/migrations/*.sql`) — la capa de datos ya
  está aislada para ese cambio.

## Checklist de seguridad mínimo

- [ ] `AUTH_SECRET` propio y largo (nunca el de desarrollo).
- [ ] HTTPS activo (Railway/Render lo dan automático).
- [ ] `/api/health` responde 200.
- [ ] Cuentas demo conocidas: recuerda que el login tiene accesos rápidos visibles — para un piloto
      serio, cambia las contraseñas del seed o conecta Supabase Auth.
- [ ] Volumen/respaldo de `.data/` configurado.
