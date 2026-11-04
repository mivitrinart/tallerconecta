# 📱 Cómo usar Taller Conecta como APK (Android)

El proyecto es una **aplicación web** (Next.js) — igual que propone el documento del MVP: primero web
adaptable a celulares, después app. Ya está **preparado como PWA** (manifiesto, iconos adaptive/maskable,
service worker y página offline), así que convertirlo en APK es un paso de empaquetado, no reescribir nada.

Tienes 3 caminos, del más rápido al más "nativo":

---

## Camino 0 · Instalar la PWA (2 minutos, sin generar APK)

1. Despliega la app en un dominio **HTTPS** (ver "Dónde hospedar" abajo).
2. En el celular Android, abre la URL en **Chrome**.
3. Menú ⋮ → **“Instalar aplicación”** (o “Agregar a la pantalla principal”).

Aparece con el icono de Taller Conecta, se abre a pantalla completa (sin barra del navegador) y funciona
como app. Ideal para validar con talleres reales antes de publicar en la Play Store.

---

## Camino 1 · APK real con Bubblewrap (TWA) — RECOMENDADO

Genera un **APK instalable** y un **AAB publicable en Google Play**. La app corre tu sitio web en una
actividad nativa de Chrome (Trusted Web Activity): misma base de código, cero duplicación.

### Requisitos (en tu PC, Windows/macOS/Linux)
- Node.js ≥ 20.9
- Java JDK 17 (Bubblewrap ofrece instalarlo automáticamente la primera vez)
- Android SDK (igual: Bubblewrap lo descarga solo si aceptas)

### Pasos
```bash
# 1) Instala la CLI oficial de Google
npm install -g @bubblewrap/cli

# 2) Apunta al manifiesto de tu app YA DESPLEGADA (HTTPS)
bubblewrap init --manifest=https://TU-DOMINIO/manifest.webmanifest
#    Responde las preguntas (valores sugeridos):
#    · Address bar color: #1d4ed8
#    · Display mode: standalone
#    · Firma: crea una keystore NUEVA y GUÁRDALA (la necesitarás para actualizar)

# 3) Genera los artefactos
bubblewrap build
```

Resultado:
- **`app-release-signed.apk`** → copialo al celular e instálalo (activa "orígenes desconocidos").
  Sirve para pruebas internas y distribución directa a tus talleres piloto.
- **`app-release-bundle.aab`** → es el archivo que sube a **Google Play Console**
  (cuenta de desarrollador: pago único de 25 USD).

### Actualizar la app ya publicada
```bash
bubblewrap update   # toma los cambios del sitio desplegado
bubblewrap build    # genera el nuevo APK/AAB con la MISMA keystore
```
> ⚠️ Firma siempre con la misma keystore: si la pierdes, no podrás actualizar la app publicada.

---

## Camino 2 · Capacitor (WebView + capacidades nativas)

Úsalo cuando necesites **plugins nativos** (push notifications reales, cámara avanzada, biometría):

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Taller Conecta" co.tallerconecta.app
```

Crea `capacitor.config.ts` apuntando a tu sitio desplegado:

```ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "co.tallerconecta.app",
  appName: "Taller Conecta",
  webDir: "public",              // no se usa con server.url
  server: {
    url: "https://TU-DOMINIO",    // la app carga tu Next.js hospedado
    cleartext: false,
  },
};
export default config;
```

```bash
npx cap add android
npx cap sync
npx cap open android     # abre Android Studio → Build > Build APK(s)
```

---

## 🌐 Dónde hospedar (importante para el modo demo)

> 📖 **Guía paso a paso de despliegue (Railway / Render / túnel local): [`docs/DESPLIEGUE.md`](DESPLIEGUE.md).**

El **modo demo** escribe los datos en `.data/db.json`, así que necesita un servidor con **disco persistente**:

| Opción | Modo demo | Notas |
|---|---|---|
| **Railway / Render / Fly.io / VPS (Docker)** | ✅ funciona tal cual | `npm run build && npm run start`, Node ≥ 20.9, volumen para `.data/` |
| **Vercel** | ⚠️ no persiste (filesystem efímero) | Para Vercel migra a **Supabase**: `DATA_MODE=supabase` + ejecuta `supabase/migrations/*.sql` (ver README). Es el camino productivo de todos modos. |

Incluye un `Dockerfile` listo para VPS/Railway. Para HTTPS gratuito: Railway/Render lo dan automático;
en VPS usa Caddy o el certificado de Let's Encrypt. **HTTPS es obligatorio** para PWA/TWA.

---

## Funciones del celular que ya funcionan en la PWA/APK

- 📷 **Cámara**: las evidencias antes/durante/después usan `input type="file" accept="image/*,video/*"` →
  en Android abre la cámara directamente y la foto se comprime en el dispositivo antes de subir.
- 🎤 **Dictado por voz**: Web Speech API (`es-CO`) funciona en Chrome/TWA.
- 💬 **WhatsApp**: el botón “¿Dónde va mi carro?” abre `wa.me` con el resumen listo → salta a la app de WhatsApp instalada.
- 🔔 **Notificaciones**: hoy son in-app + correo/WhatsApp simulados. Push nativas reales requieren conectar
  Supabase (Realtime) + un proveedor (FCM) — es el siguiente paso del roadmap.

---

## Checklist antes de publicar en Play Store

1. App desplegada en HTTPS con `AUTH_SECRET` propio y (recomendado) Supabase en vez del modo demo.
2. `bubblewrap init` + `build` con keystore guardada en un lugar seguro.
3. Sube el `.aab`, captura de pantallas, política de privacidad (puedes enlazar `/legal/privacidad`).
4. Prueba interna con tus talleres piloto → producción.
