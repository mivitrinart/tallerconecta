# 🔧 Taller Conecta — MVP

Plataforma que conecta **talleres mecánicos con sus clientes** para mejorar la atención, reducir llamadas y mensajes repetitivos, agilizar las autorizaciones de reparación y aumentar la confianza durante el servicio.

> **Objetivo del MVP:** que el cliente siempre sepa qué sucede con su carro o moto, cuánto cuesta la reparación y qué debe aprobar, **sin tener que llamar al taller**.

Implementación completa del proyecto descrito en `text-to-markdown.md`: aplicación web **Next.js 16 + React 19 + TypeScript + Tailwind CSS 4**, adaptable a celulares y computadores, con capa de datos lista para **Supabase** (PostgreSQL + Auth + Storage + Realtime). Incluye **modo demo sin servidor** para validar el producto de inmediato y **0 vulnerabilidades** en `npm audit`.

---

## 🚀 Inicio rápido (modo demo, sin configurar nada)

Requisito: **Node.js ≥ 20.9** (Next.js 16).

```bash
npm install
npm run dev
# → http://localhost:3000
```

> En máquinas con poca RAM (< 2 GB), el build de producción puede requerir el bundler clásico:
> `npm run build -- --webpack`. El chequeo de tipos vive en `npm run typecheck`.

Los datos de demostración se crean automáticamente en `.data/db.json` (todos ficticios). Para restablecerlos al estado inicial:

```bash
POST /api/admin/reset-demo  # requiere rol platform_admin
```

### Accesos de demostración

| Rol | Correo | Contraseña | Entra a |
|---|---|---|---|
| **Propietario del taller** (Taller MotorX) | `carlos@motorx.co` | `taller123` | `/taller/dashboard` |
| **Asesora de servicio** | `ana@motorx.co` | `taller123` | `/taller/dashboard` |
| **Mecánico** | `luis@motorx.co` | `taller123` | Solo sus trabajos asignados |
| **Administrador de la plataforma** | `admin@tallerconecta.co` | `taller123` | `/admin` |
| **Cuenta de cliente** (María Gómez) | `maria.gomez@example.co` | `cliente123` | `/cuenta` |

### Portales de cliente (enlace personal, sin contraseña)

- María Gómez (Mazda 3, presupuesto v2 pendiente de aprobación): **`/seguimiento/tok_maria_demo`**
- Jorge Peña (Yamaha FZ, en diagnóstico): `/seguimiento/tok_jorge_demo`
- Diana Rivas (Renault Duster, presupuesto sin responder hace 3 días): `/seguimiento/tok_dianarivas_demo`

`/login` es la **entrada única de sesión con selector “Soy del taller” / “Soy cliente”**: la pestaña del personal tiene botones de acceso rápido (contraseña `taller123`) y restablecer datos demo; la de clientes enlaza al registro de la cuenta (`/login?tipo=cliente` abre directo la pestaña de cliente, y es el enlace que usa el portal de seguimiento).

**Sesión persistente (7 días):** con la sesión iniciada, el sitio público reconoce al usuario —la cabecera y el inicio muestran *“Ir al panel”* (personal/admin) o *“Ir a mi cuenta”* (cliente) con saludo y cierre de sesión— y las pantallas de login/registro redirigen directamente al panel correspondiente sin volver a pedir credenciales.

Los clientes pueden usar su **enlace personal** sin cuenta, o crear una **cuenta de cliente** en `/cuenta/registro` (contraseña libre + autorización de tratamiento de datos): la cuenta reúne en una sola ventana —la misma del seguimiento— todas sus fichas vinculadas con sus enlaces personales, con perfil editable de guardado automático, desvinculación (que anula el enlace) y derecho de supresión.

---

## ✅ Qué incluye (todo lo del documento)

### Las 3 áreas del producto
1. **Panel del taller** (`/taller/*`) — administra la operación y las órdenes.
2. **Portal del cliente** (`/seguimiento/[token]`) — acceso seguro por enlace personal.
3. **Panel de administración de la plataforma** (`/admin/*`) — gestiona talleres, planes, usuarios y suscripciones del SaaS.

### Los 6 módulos funcionales

| Módulo | Implementación |
|---|---|
| **1. Panel principal del taller** | KPIs (activas, por aprobar, en reparación, listos), vehículos recibidos hoy, alertas de clientes sin respuesta (>48 h), trabajos retrasados vs. fecha estimada, diagnósticos pendientes y mensajes sin leer. Tablero por estado. |
| **2. Clientes y vehículos** | Fichas con contacto, documentos, vehículos (placa, marca, modelo, año, km, color), kilometraje de ingreso, historial de visitas y reparaciones, búsqueda por nombre/placa/orden, calificación promedio y gasto total. |
| **3. Órdenes de servicio** | Número único por taller (ORD-1053…), motivo y síntomas, diagnóstico con hallazgos y recomendaciones, mecánico responsable, fotografías antes/durante/después (con compresión en el navegador), fecha **estimada** de entrega y notas internas. |
| **4. Presupuestos y autorizaciones** | Repuestos, mano de obra y servicios; cantidades, precios, descuentos, IVA 19 % (configurable) y total; envío al cliente; **aprobación o rechazo por cada trabajo**; registro de fecha, usuario y **versión autorizada**; versiones nuevas que exigen re-aprobación; precio autorizado congelado. |
| **5. Portal del cliente** | Enlace personal seguro, estado actualizado con línea de tiempo, diagnóstico, presupuesto con botones aprobar/rechazar por ítem (con total dinámico), evidencias fotográficas, canal de preguntas y calificación del servicio tras la entrega. **Cuenta de cliente** (`/cuenta`): perfil, vinculación de fichas por correo o enlace, y **registro de sus propios vehículos** (carro/moto que usa) que el taller ve en su panel marcados como “registrado por el cliente”. |
| **6. Notificaciones y atención** | Avisos de vehículo recibido, diagnóstico listo, presupuesto pendiente, reparación iniciada/finalizada, vehículo listo, mensajes nuevos y respuestas pendientes. Bandeja de salida simulada (correo + WhatsApp fase 2) en Configuración → Comunicaciones. |

### Roles y permisos (sección 2)

| Rol | Qué puede hacer |
|---|---|
| Administrador de la plataforma | Gestionar talleres registrados, suscripciones, usuarios y soporte. |
| Propietario del taller | Todo lo anterior dentro de su taller: configuración, empleados, clientes y órdenes. |
| Asesor de servicio | Recibir vehículos, registrar diagnósticos, elaborar presupuestos y responder consultas. |
| Mecánico | **Solo** consultar trabajos asignados, actualizar avances (estados permitidos) y cargar evidencias. |
| Cliente | Portal por enlace personal: consultar, ver diagnóstico, aprobar presupuestos y comunicarse. |

**Cada taller es un espacio privado**: todas las consultas y mutaciones filtran por `workshop_id` de la sesión; en Supabase se refuerza con Row Level Security.

### Funciones anti-llamadas y de confianza

- **Línea de tiempo tipo Rappi/Uber**: banner “Ahora mismo” (quién está atendiendo tu vehículo y qué está haciendo, actualizado hace X), paso a paso con hora y fotos de cada etapa, y portal **en vivo** (se refresca solo cada 15 s, sin iniciar sesión — modo taller transparente).
- **Checklist visual obligatorio**: sin evidencia del **ANTES** (foto o video de 15 s del ruido/falla) la orden no pasa a diagnóstico; sin foto del **DESPUÉS** no se marca “Listo para entregar”. Adiós al “eso ya venía así”.
- **Botón “¿Dónde va mi carro?”**: un botón gigante en el portal genera el resumen automático del estado y abre WhatsApp con el texto listo (`wa.me`); el envío queda registrado en la bandeja de salida simulada.
- **Autorización parcial real**: por cada trabajo el cliente elige ✓ Aprobar · ⏰ Después · ✗ Rechazar — *“autorizo solo frenos, no suspensión por ahora”*. Lo aplazado **no bloquea** la reparación de lo aprobado y queda registrado (`items_postergados`) para proponerlo en una versión nueva.
- **Presupuesto inteligente con semáforo**: cada ítem se clasifica 🟢 Urgente/seguridad · 🟡 Recomendado pronto · 🔴 Puede esperar. El cliente entiende **por qué pagar**. En el panel del taller el semáforo se asigna al crear el presupuesto y se puede **editar ítem por ítem mientras sea borrador** (detalle de la orden → Presupuestos, y en la página **Presupuestos** con resumen 🟢🟡🔴 por versión + lista desplegable de ítems). Una vez enviado al cliente, el semáforo es **inmutable** (crear versión nueva); cada cambio queda en el historial y la auditoría.
- **Firma digital de entrega**: el cliente firma en el portal tras la entrega (canvas táctil); la firma se guarda como evidencia junto a las fotos de salida y no puede firmarse dos veces.
- **Voz a texto para el mecánico**: botón “Dictar por voz” en mensajes y diagnóstico (Web Speech API, es-CO); si el navegador no lo soporta, se degrada elegantemente.
- **Presupuesto con comparativa original/homologado**: por ítem, el taller añade la alternativa más económica y marca cuál recomienda (⭐). En el portal el cliente compara ambas opciones y **elige** — el monto aprobado y la autorización registran su elección (`items_con_alternativa`), y el historial la refleja (“eligió HOMOLOGADO en…”). Poder de decisión para el cliente y ticket más alto para el taller.
- **Recordatorios automáticos de mantenimiento (retención)**: el dashboard lista los vehículos cuyo último servicio entregado tiene **3+ meses** (con km y fecha) y el botón **“Avisar ahora”** envía al cliente el aviso “Tu {vehículo} necesita mantenimiento” (portal + correo simulado). No se repite antes de 30 días por vehículo; queda auditado.

### Seguridad y aspectos legales en Colombia 🔒⚖️

Módulo transversal (no opcional): los talleres manejan datos de contacto, fotografías, placas y decisiones de reparación.

| Requisito | Implementación |
|---|---|
| **Protección de datos (Ley 1581 de 2012)** | `/legal/privacidad`: política completa con responsables/encargados, finalidades, derechos del titular (conocer, actualizar, rectificar, suprimir, revocar), procedimiento de reclamos (15 días hábiles), conservación y RNBD. Aviso de privacidad en el portal. |
| **Aviso y autorizaciones de tratamiento** | Casilla obligatoria de autorización en el registro de clientes y cuentas (rechazada en servidor si falta); cada ficha guarda `consentimiento_datos_at` y `consentimiento_origen`. |
| **Separación de talleres** | RLS por `workshop_id` en PostgreSQL (`supabase/migrations/0001`) + guardas en cada ruta API (`lib/auth/guards.ts`): **nunca se confía solo en el frontend**. Datos de otro taller → 404/403 (probado en E2E). |
| **Autorizaciones inmutables** | Cada decisión registra versión del presupuesto, usuario, fecha, ítems y monto. No se puede re-decidir un presupuesto decidido; los cambios exigen versión nueva con re-aprobación (probado en tests). |
| **Historial** | `order_events` (línea de tiempo) + `audit_logs` (acciones sensibles: cancelaciones, supresiones, cambios de plan, logins). Sin borrado por el personal del taller. |
| **Archivos con acceso restringido** | Fotos/documentos NO públicos: `GET /api/media/[id]` valida en el servidor (personal del taller, cuenta vinculada o enlace personal + `visible_cliente`) y responde como enlace temporal (`Cache-Control: private, no-store`; en Supabase: URLs firmadas con expiración). |
| **Pagos** | La primera versión **no almacena datos de tarjetas** ni implementa pasarela de pagos (se elimina superficie PCI-DSS innecesaria). |
| **Privacidad del cliente** | El cliente solo ve sus propios servicios; el taller solo consulta lo necesario para el servicio; validación zod estricta en todas las entradas. |
| **Documentación contractual** | `/legal/terminos`: responsabilidades del taller, de la plataforma y del cliente; validez de la aprobación electrónica (Ley 527/1999); conservación y eliminación; ley colombiana. `/legal/seguridad`: medidas técnicas. |
| **Derecho de supresión** | Cuenta de cliente: botón "Eliminar mi cuenta" (borrado lógico). Ficha en el taller: "Solicitud de supresión de datos" (solo propietario) → anonimiza contactos, invalida el enlace personal y **conserva el historial por obligación legal**. Bloqueado si hay órdenes activas. Auditado. |

> ⚠️ Los textos legales son plantillas de referencia del MVP: **revisar con asesoría jurídica en Colombia** las obligaciones concretas según el modelo comercial, los flujos de datos y la forma de prestar el servicio.

### Equipo: el taller crea las cuentas de sus mecánicos 👷

- Página **Equipo** en el sidebar del propietario (`/taller/equipo`, también en Configuración → Equipo): añadir mecánicos/asesores con nombre, correo, teléfono y rol.
- **Acceso sin registro**: el taller define la contraseña inicial o el sistema genera una **temporal que se muestra una sola vez** (tarjeta verde con botones copiar). El mecánico entra en `/login` → pestaña **“Soy del taller”** con esas credenciales — nunca necesita registrarse.
- **“Nueva contraseña”** por miembro si alguien la olvida (la anterior deja de funcionar al instante).
- **Asignación directa de órdenes**: la tarjeta “Carga de trabajo y asignación” muestra los trabajos activos de cada miembro (chips con estado, clic para abrir la orden), el conteo de órdenes sin asignar y un selector para **asignarle una orden activa al instante** (las sin asignar aparecen primero; el miembro recibe notificación y el evento queda en el historial de la orden).
- Roles con permisos mínimos: el mecánico solo ve sus trabajos asignados, actualiza avances y carga evidencias; el asesor no puede gestionar miembros. Cada invitación y cambio de contraseña queda en la **auditoría**.

### Flujo completo de atención (sección 4)

`Recepción → Diagnóstico → Presupuesto enviado → Decisión del cliente (aprobar / rechazar / consultar) → Reparación y seguimiento → Entrega y cierre (valor final + calificación)`

### Los 10 estados de la orden, con máquina de estados

`Recibido · En diagnóstico · Esperando aprobación · Autorizado · En reparación · En espera · En pruebas · Listo para entregar · Entregado · Cancelado`

Reglas implementadas y probadas (tests unitarios + E2E):

- **Regla fundamental:** una orden **no puede pasar a reparación** si existe un presupuesto enviado con trabajos que requieren autorización y aún están pendientes. ✔
- Si hay varios trabajos, el sistema **distingue cuáles están aprobados y cuáles no** (aprobación parcial con monto autorizado proporcional). ✔
- Cancelar **exige motivo** registrado. ✔
- Los cambios de estado solo siguen las **transiciones permitidas** (nada de saltos). ✔
- Los trabajos adicionales requieren una **autorización nueva** (versión nueva del presupuesto → re-aprobación). ✔
- Las notificaciones **nunca afirman algo que el taller no actualizó** (solo se generan desde cambios reales en la base). ✔
- Las fechas de entrega siempre se muestran como **estimaciones, no promesas**. ✔

---

## 🛡 Protección contra bots y cuentas automatizadas

Se implementaron medidas anti-bot en todos los formularios de registro e inicio de sesión para evitar la creación masiva de cuentas falsas y el abuso de endpoints públicos:

| Medida | Descripción | Aplica a |
|---|---|---|
| **Honeypot** | Campo oculto `sitio_web` (CSS fuera de viewport, `aria-hidden`, `tabIndex=-1`). Si llega con valor, la API rechaza silenciosamente (200 vacío) sin crear cuenta ni iniciar sesión. | `/api/cuenta/registro`, `/api/cuenta/login`, `/api/registro`, `/api/auth/login` |
| **Detección de automatización** | `navigator.webdriver` en cliente; si es `true`, el request es rechazado silenciosamente por el servidor. | Todos los formularios de login/registro |
| **Rate limiting** | Ventana deslizante por IP en Redis (demo: memoria): login 5 req/5 min, registro 3 req/10 min, vinculación 10 req/hora, APIs 30 req/min. HTTP 429 con `Retry-After`. | Todas las rutas de auth y registro |
| **Scroll automático arriba** | Al cambiar de ruta o recargar, `window.scrollTo(0, 0)` evita que el usuario quede atrapado en mitad de página. | Todo el sitio (RootLayout) |

---

## 🗂 Estructura del proyecto (sección 8 del documento)

```
taller-conecta/
├── app/
│   ├── (publico)/            # Landing, /precios, /registro
│   ├── (auth)/               # /login, /recuperar-acceso
│   ├── taller/
│   │   ├── dashboard/        # Módulo 1 · panel principal
│   │   ├── ordenes/          # Módulo 3 · lista, recepción (nueva) y detalle [id]
│   │   ├── equipo/           # Añadir mecánicos/asesores + credenciales (owner)
│   │   ├── clientes/         # Módulo 2 · fichas e historial
│   │   ├── vehiculos/        # Módulo 2
│   │   ├── presupuestos/     # Módulo 4 · vista consolidada
│   │   ├── mensajes/         # Módulo 6 · bandeja de atención
│   │   └── configuracion/    # Datos, equipo, comunicaciones, portales, auditoría (incluye días restantes de prueba)
│   ├── seguimiento/[token]/  # Módulo 5 · portal del cliente (enlace personal)
│   ├── cuenta/               # Cuenta de cliente: perfil + misma ventana de seguimiento
│   ├── legal/                # privacidad (Ley 1581), términos y seguridad
│   ├── admin/                # SaaS · resumen, talleres, usuarios, suscripciones
│   └── api/                  # Rutas de API (auth, cuenta, ordenes, presupuestos, portal, media, admin, reset-demo…)
├── components/
│   ├── ui/                   # Botones, tarjetas, badges, modales, tabs, estrellas…
│   ├── orders/               # StatusControl, StatusTimeline, NewOrderForm, evidencias…
│   ├── vehicles/ customers/ estimates/ notifications/ shared/
│   ├── auth/                 # Formularios de login/registro con honeypot y detección de automatización
│   ├── cuenta/               # Lista de talleres públicos (diseño horizontal, "Ver más" ampliado)
│   └── shared/               # ScrollToTop, LogoUpload, AppShell…
├── lib/
│   ├── auth/                 # Sesión JWT (jose) + guardas por rol y taller + rate-limit
│   ├── database/             # tipos, queries, demo-store (JSON), supabase-client
│   ├── orders/               # máquina de estados + workflows (plan pro en prueba, caducidad a starter)
│   ├── permissions/          # matriz de permisos por rol
│   ├── notify/               # generación de notificaciones (regla fundamental)
│   └── validations/          # esquemas zod de todas las entradas
├── public/logos/default.svg   # Ícono predeterminado de mecánico/taller (wrench + auto)
├── supabase/
│   ├── migrations/0001_initial_schema.sql   # 16 tablas + RLS + triggers
│   ├── migrations/0002_cuentas_cliente_y_consentimiento.sql  # Ley 1581 + cuentas
│   ├── migrations/0003_vehiculos_registrados_por_cliente.sql # origen del dato
│   ├── migrations/0004_desvinculacion_propagada.sql          # portal_activo
│   ├── migrations/0005_aprobacion_parcial_semaforo.sql       # aplazados + criticidad
│   ├── migrations/0006_comparativa_y_recordatorios.sql       # original/homologado + retención
│   └── seed.sql                             # datos demo en SQL
└── tests/                    # node:test + tsx (44 pruebas) + smoke-e2e.py (101 checks HTTP)
```

---

## 🏗 Arquitectura y tecnología (sección 7)

| Capa | MVP (hoy) | Producción (plan del documento) |
|---|---|---|
| Frontend | **Next.js 16 (App Router, Turbopack) + React 19 + TypeScript**, responsive mobile-first | Igual (web adaptable; después app móvil) |
| Diseño | **Tailwind CSS 4** (config CSS-first, `@theme`/`@utility`) | Igual |
| Backend / datos | **Modo demo**: store JSON local (`.data/db.json`) tras la misma interfaz | **Supabase**: PostgreSQL, Auth, Storage privado y Realtime |
| Notificaciones | Bandeja de salida **simulada** (correo/WhatsApp) | Correo transaccional; WhatsApp Business Platform oficial (fase 2) |

La capa de datos está aislada en `lib/database/` + `lib/orders/workflows.ts`: **las pantallas y la API no cambian al migrar a Supabase**.

### Planes y prueba gratuita

- Al registrar un taller nuevo, el plan asignado es **pro** durante **7 días de prueba gratis**.
- Al vencer los 7 días, la suscripción pasa a `vencida` y el taller vuelve a plan **starter** (estado activo, no suspendido).
- En Configuración → Plan y estado se muestra el contador de **días restantes** de la prueba.

### Conectar Supabase (cuando tengas el proyecto)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ejecuta `supabase/migrations/0001_initial_schema.sql` en el SQL Editor (crea las 16 tablas, RLS por taller, triggers de numeración y `updated_at`).
3. Opcional: ejecuta `supabase/seed.sql` para cargar los datos de demostración.
4. Crea el bucket **privado** `order-media` en Storage.
5. Copia `.env.example` a `.env.local` y completa `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`; cambia `AUTH_SECRET`.
6. Cambia `DATA_MODE=supabase` e implementa los adapters en `lib/database/supabase-client.ts` (las firmas de `queries.ts`/`workflows.ts` ya están pensadas para ello).

---

## 🔌 API (rutas internas)

| Método y ruta | Descripción | Quién |
|---|---|---|
| `POST /api/auth/login` · `POST /api/auth/logout` | Sesión demo (JWT en cookie httpOnly) | Público |
| `POST /api/registro` | Registro público de taller + suscripción en prueba (7 días, plan pro) | Público |
| `POST /api/ordenes` | Recepción de vehículo (crea cliente/vehículo si es nuevo) | owner/advisor |
| `POST /api/ordenes/[id]/estado` | Cambio de estado con máquina de estados + guardas | owner/advisor/mecánico (limitado) |
| `POST /api/ordenes/[id]/diagnostico` | Registro de diagnóstico → notifica al cliente | owner/advisor/mecánico |
| `POST /api/ordenes/[id]/asignar` · `/notas` · `/media` · `/mensajes` · `/entregar` · `/leer` | Asignación, notas y fecha estimada, evidencias, respuestas, entrega con valor final, marca de lectura | según rol |
| `POST /api/presupuestos` | Nueva versión (borrador) con ítems, descuento, IVA y semáforo | owner/advisor |
| `PATCH /api/presupuestos/[id]/items/[itemId]` | Semáforo de criticidad de un ítem (solo borrador) | owner/advisor |
| `POST /api/presupuestos/[id]/enviar` | Envío al cliente → orden a “Esperando aprobación” | owner/advisor |
| `POST /api/presupuestos/[id]/decision` | Decisión del cliente **por ítem** (token del portal) | cliente |
| `POST /api/portal/mensajes` · `/calificar` · `/leer` | Acciones del portal del cliente | cliente |
| `GET /api/notificaciones` · `POST /api/notificaciones/leer` | Campana del personal | staff |
| `PATCH /api/taller/configuracion` · `POST /api/taller/miembros` · `PATCH /api/taller/miembros/[id]` | Datos del negocio y equipo | owner |
| `POST /api/taller/miembros/[id]/password` | Genera/define nueva contraseña de un miembro (se muestra una vez) | owner |
| `POST /api/cuenta/registro` · `/login` · `/logout` · `PATCH /api/cuenta/perfil` | Cuenta de cliente (consentimiento obligatorio en el registro) | cliente |
| `POST /api/cuenta/vincular` · `/desvincular` · `/eliminar` | Vincular enlace personal (lo reactiva), desvincular ficha (desactiva el enlace y retira vehículos) y derecho de supresión | cliente |
| `POST /api/clientes/[id]/regenerar-enlace` | El taller genera un enlace NUEVO (el anulado no revive jamás) y notifica al cliente | owner/advisor |
| `POST /api/cuenta/vehiculos` · `PATCH /api/cuenta/vehiculos/[id]` | El cliente registra/edita la info de su carro (visible en el panel del taller) | cliente |
| `GET /api/media/[id]` | Acceso restringido a fotos/documentos (enlace temporal) | staff / cuenta / token |
| `GET /api/health` | Health check para Railway/Render/Docker | público |
| `POST /api/clientes/[id]/anonimizar` | Solicitud de supresión sobre la ficha (Ley 1581) | owner |
| `PATCH /api/admin/talleres/[id]` · `/suscripciones/[id]` · `/usuarios/[id]` · `POST /api/admin/reset-demo` | Operación del SaaS | admin plataforma |

Todas las rutas revalidan sesión, permisos y `workshop_id` (las validaciones zod viven en `lib/validations/schemas.ts`).

---

## 📱 Usarlo como app de Android (APK)

El proyecto está **preparado como PWA** (manifiesto en `app/manifest.ts`, iconos adaptive/maskable en `public/icons/`, service worker network-first y página offline). Guía completa en **[`docs/COMO-GENERAR-APK.md`](docs/COMO-GENERAR-APK.md)**:

0. **Despliegue con HTTPS paso a paso**: [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md) (Railway con volumen persistente, Render gratis, o túnel local con cloudflared para un APK de prueba hoy mismo).
1. **Camino 0 (2 min)**: desplegar en HTTPS → Chrome del celular → ⋮ → **“Instalar aplicación”**.
2. **Camino 1 (APK real, recomendado)**: [`@bubblewrap/cli`](https://github.com/GoogleChromeLabs/bubblewrap) genera `app-release-signed.apk` (instalable) y `.aab` (Google Play) apuntando al manifiesto desplegado.
3. **Camino 2**: Capacitor con `server.url` cuando necesites plugins nativos (push reales, biometría…).

La cámara (evidencias), el dictado por voz y el salto a WhatsApp ya funcionan en el APK. Incluye `Dockerfile` para hospedar con disco persistente (el modo demo escribe en `.data/`); en Vercel, migrar a Supabase.

---

## 🔐 Seguridad de dependencias

El stack está actualizado a versiones sin vulnerabilidades conocidas (`npm audit` → **0**): Next 16.4.2 · React 19.3.1 · Tailwind 4.3.3 · postcss 8.5.30 · tsx 4.23.15 · zod/jose sin avisos. Las APIs de petición de Next 16 (`params`, `searchParams`, `cookies()`) son asíncronas y así están migradas. Verifica en cualquier momento con:

```bash
npm audit
```

---

## 🧪 Pruebas

```bash
npm test        # 65 pruebas unitarias y de integración (node:test + tsx)
npm run build   # compilación de producción

# Smoke test E2E (~101 verificaciones HTTP reales):
npm run build && npm run start -- -p 3100   # en otra terminal
python3 tests/smoke-e2e.py
```

Cobertura: máquina de estados (transiciones y regla fundamental), validaciones zod, cálculos de IVA/descuento, workflows completos (recepción → diagnóstico → presupuesto v1/v2 → aprobación parcial → reparación → entrega → calificación), notificaciones, rechazo y re-aprobación por versión, mensajería, registro SaaS, **aislamiento entre talleres**, cuentas de cliente (consentimiento, vinculación, supresión), **inmutabilidad de autorizaciones** y anonimización de fichas.

El smoke E2E (`tests/smoke-e2e.py`) valida 214 comportamientos contra el servidor real, incluidas las páginas legales, el control de acceso a medios y los flujos completos de cuenta de cliente.

---

## 🗺 Roadmap (fuera del MVP, según el documento)

- App móvil nativa (la web responsive es el primer paso).
- WhatsApp Business Platform oficial (plantillas, consentimiento y costos).
- Pagos y facturación electrónica (Colombia).
- Marketplace de talleres, inventarios y contabilidad.
- IA para diagnósticos asistidos.
- Supabase Realtime en el portal (hoy: sondeo cada 15–30 s).

---

## ⚠️ Avisos

- Los datos, cifras, vehículos y fotos de la demostración son **ficticios**.
- Las contraseñas en texto plano (`password_demo`) existen **solo en el modo demo**; en producción la autenticación la maneja Supabase Auth.
- Las fechas estimadas de entrega se muestran siempre como **estimaciones, no promesas**.
- Las notificaciones por WhatsApp requieren configuración, consentimiento y plantillas cuando correspondan; no se usan automatizaciones no oficiales.

---

## 📜 Cambios recientes (esta sesión)

- **Lista de talleres registrados**: heading actualizado a “Ver Lista de Talleres Registrados”; tarjetas en disposición horizontal (flex-wrap); botón “Ver más” más amplio que redirige a `/cuenta`; accordion siempre expandido por defecto.
- **Página de precios**: fondo devuelto al azul brand-900; texto “Planes” y badge “Más popular” en amarillo de acento.
- **Imagen predeterminada de perfil**: `public/logos/default.svg` reemplazado por ícono temático de mecánico/taller (llave inglesa + silueta de auto) usado como fallback en tarjetas de taller y página de perfil.
- **Anti-bot**: honeypot `sitio_web` + detección de `navigator.webdriver` en los 4 formularios de login/registro (cliente y taller) y sus respectivas rutas API; rechazo silencioso sin crear cuenta ni iniciar sesión.
- **Scroll arriba**: componente `ScrollToTop` agregado a `RootLayout`; el scroll vuelve al inicio en cada cambio de ruta o recarga.
- **Prueba gratuita**: texto “14 días” → “7 días”; plan por defecto “básico” → “pro”; al registrarse el taller obtiene plan **pro** por 7 días, y al vencer la prueba regresa automáticamente a **starter**.
- **Configuración del taller**: en “Plan y estado” se muestra el contador de **días restantes** de la prueba gratuita.
- **Base de datos demo restablecida**: solo quedan los datos de seed (Taller MotorX, AutoSur Mecánica y usuarios de demostración).
