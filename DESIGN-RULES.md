# Reglas de Diseño · TallerConecta

Este documento define los principios y estándares de diseño que deben seguirse en toda la aplicación.

---

## 1. Estados de Carga (Skeleton)

### Principio
Mostrar placeholders visuales que anticipan la estructura del contenido **antes** de que los datos lleguen, evitando saltos de layout (CLS) y mejorando la percepción de velocidad.

### Implementación
- Usar el componente `Skeleton` para cada tipo de contenido: texto, tarjetas, tablas, avatares, botones.
- Animación `pulse-soft` (definida en `globals.css`) para indicar carga activa.
- Mantener las mismas dimensiones que el contenido final (alto, ancho, border-radius).

### Variantes disponibles
| Variante | Uso | Clase base |
|----------|-----|------------|
| `text` | Líneas de texto, párrafos | `h-4 w-full` |
| `heading` | Títulos | `h-6 w-3/4` |
| `card` | Tarjetas completas | `aspect-video` |
| `avatar` | Avatares de usuario | `h-10 w-10 rounded-full` |
| `button` | Botones en estado carga | `h-10 w-24 rounded-xl` |
| `table-row` | Filas de tabla | `h-12` |
| `badge` | Etiquetas de estado | `h-5 w-20 rounded-full` |

### Uso
```tsx
import { Skeleton } from "@/components/ui";

<Skeleton variant="card" />
<Skeleton variant="text" lines={3} />
<Skeleton variant="avatar" size="lg" />
```

---

## 2. Diseño Responsive

### Breakpoints oficiales (Tailwind v4)
| Nombre | Ancho | Uso principal |
|--------|-------|---------------|
| `sm` | 640px | Móvil grande / tablet pequeña |
| `md` | 768px | Tablet portrait |
| `lg` | 1024px | Tablet landscape / desktop pequeño |
| `xl` | 1280px | Desktop estándar |
| `2xl` | 1536px | Desktop grande |

### Reglas obligatorias
1. **Mobile-first**: Escribir estilos base para móvil, añadir complejidad con `sm:`, `md:`, `lg:`, `xl:`.
2. **Contenedor fluido**: Usar `max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8` en páginas principales.
3. **Touch targets**: Mínimo 44×44px (`h-11 w-11`) en elementos interactivos en móvil.
4. **Tipografía fluida**: Usar `text-sm sm:text-base`, `text-xl sm:text-2xl`, etc.
5. **Espaciado responsivo**: `gap-3 sm:gap-4 lg:gap-6`, `py-4 sm:py-6 lg:py-8`.
6. **Grid adaptativo**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
7. **No horizontal scroll**: `overflow-x-hidden` en body; tablas con `overflow-x-auto` solo si es necesario.

### Patrones comunes
```tsx
// Stack en móvil, grid en desktop
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

// Sidebar colapsable en móvil
<aside className="hidden lg:block lg:w-64">

// Tabla con scroll horizontal solo en móvil
<div className="overflow-x-auto sm:overflow-visible">
  <table className="min-w-full sm:min-w-0">...</table>
</div>
```

---

## 3. Jerarquía Visual

### Principio
Guiar la atención del usuario hacia la **acción principal** y hacer que la interfaz sea **escaneable** en segundos.

### Niveles de jerarquía
| Nivel | Elementos | Estilo |
|-------|-----------|--------|
| **1. Primaria** | Un botón/acción por vista | `btn-primary` / `btn-action` — brand-600, sombra, tamaño `lg` |
| **2. Secundaria** | Acciones de apoyo | `btn-secondary` — borde slate-300, fondo blanco |
| **3. Terciaria/Ghost** | Acciones menores, enlaces | `btn-ghost` — solo texto, hover sutil |
| **4. Destructiva** | Eliminar, rechazar | `btn-danger` — red-600 |

### Reglas de escaneabilidad
- **F-pattern / Z-pattern**: Título → Subtítulo → Acción principal → Contenido.
- **Espacio en blanco**: `gap-4` entre secciones, `py-6` en paneles.
- **Tipografía**: `font-extrabold` solo en H1/H2; `font-semibold` en H3/cards; `font-medium` en labels.
- **Color semántico**: Solo brand para acciones; rojo/ámbar/verde solo para estados (error/warning/success).
- **Agrupación visual**: Cards (`card`), Paneles (`panel`), Sections (`section-head`).

### Ejemplo de vista bien jerarquizada
```tsx
<PageHeader
  kicker="Órdenes"
  title="Panel de control"
  subtitle="Gestiona las órdenes activas del taller"
  actions={<Button variant="action" size="lg">Nueva orden</Button>}
/>

<SectionTitle actions={<Button variant="ghost">Ver todas</Button>}>
  Órdenes recientes
</SectionTitle>

<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {ordenes.map(o => <OrderCard key={o.id} {...o} />)}
</div>
```

---

## 4. Consistencia entre Componentes

### Lenguaje visual unificado
Todos los componentes base (`Button`, `Card`, `Field`, `Modal`, `Badge`, `Alert`, `Input`, `Select`, `Tabs`, `Avatar`, `KpiCard`, `StatCard`) comparten:

| Propiedad | Valor estándar |
|-----------|----------------|
| **Border-radius** | `rounded-xl` (1rem) — `rounded-2xl` en paneles/cards grandes |
| **Sombra** | `shadow-sm` (card) / `shadow-card` / `shadow-lift` (hover) |
| **Borde** | `border-slate-200` (neutro) / `border-brand-200` (focus) |
| **Padding** | `px-4 py-2.5` (inputs/botones md) / `px-5 py-4` (card body) |
| **Tipografía** | `text-sm` base, `font-semibold` en labels/títulos |
| **Transiciones** | `transition-all duration-200` / `hover:shadow-md` |
| **Focus visible** | `ring-2 ring-brand-500 ring-offset-2` (definido en globals.css) |

### Tokens de diseño (globals.css)
```css
--radius-card: 1rem;        /* cards, modales, paneles */
--radius-sm: 0.6rem;        /* inputs, botones, badges */
--shadow-card: 0 1px 3px...;
--shadow-lift: 0 10px 24px...;
--shadow-glow: 0 0 0 1px...; /* focus/brand */
```

### Checklist de consistencia
- [ ] ¿El componente usa `cn()` para combinar clases?
- [ ] ¿Respeta `variant` y `size` estándar?
- [ ] ¿Tiene estado `loading`, `disabled`, `error`?
- [ ] ¿Usa `focus-visible` accesible?
- [ ] ¿Los colores vienen de tokens (brand, slate, semaf)?
- [ ] ¿El radio de borde es `rounded-xl` o `rounded-2xl`?
- [ ] ¿La sombra es `shadow-sm` / `shadow-card`?

---

## 5. Estados de la Interfaz

### Estados obligatorios por componente

| Componente | Empty | Loading | Error | Success | Disabled |
|------------|-------|---------|-------|---------|----------|
| **Button** | — | Spinner + texto "Cargando…" | — | — | `opacity-60 cursor-not-allowed` |
| **Card/List** | `EmptyState` | `Skeleton` × N | `Alert tone="error"` | `Alert tone="success"` | — |
| **Field/Input** | Placeholder | `Skeleton variant="text"` | `border-red-300` + mensaje | `border-emerald-300` | `bg-slate-50` |
| **Modal** | — | Spinner en footer | `Alert` en body | Toast + cierre auto | — |
| **Table** | `EmptyState` en tbody | `Skeleton variant="table-row"` × 5 | `Alert` sobre tabla | — | — |
| **Page/Section** | `EmptyState` full-width | `Skeleton` grid | `Alert` + botón reintentar | Toast global | — |

### Componentes de estado disponibles

#### `EmptyState`
```tsx
<EmptyState
  icon={<InboxIcon />}
  title="No hay órdenes"
  description="Cuando entren órdenes aparecerán aquí."
  action={<Button variant="primary">Crear orden</Button>}
/>
```

#### `Alert`
```tsx
<Alert tone="error" title="Error al guardar">
  Verifica tu conexión e inténtalo de nuevo.
  <Button variant="secondary" size="sm" className="mt-2">Reintentar</Button>
</Alert>

<Alert tone="success" title="Orden creada">
  La orden #1234 ya está activa.
</Alert>
```

#### `Skeleton` (nuevo)
```tsx
// En lista de órdenes
<div className="grid gap-4 sm:grid-cols-2">
  {ordenes.length > 0 ? (
    ordenes.map(o => <OrderCard key={o.id} {...o} />)
  ) : (
    <>
      <Skeleton variant="card" />
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </>
  )}
</div>
```

### Toast global (Sonner)
- **Success**: Verde, auto-close 3s, acción "Deshacer" si aplica.
- **Error**: Rojo, no auto-close, botón "Reintentar" / "Cerrar".
- **Info**: Azul, auto-close 4s.
- **Warning**: Ámbar, auto-close 5s.

---

## Aplicación práctica

### Al crear un nuevo componente
1. Extiende `components/ui/index.tsx` o usa sus primitivas.
2. Incluye **todos los 5 estados** (empty, loading, error, success, disabled).
3. Usa **tokens de diseño** (no valores hardcodeados).
4. Prueba en **3 breakpoints**: móvil (375px), tablet (768px), desktop (1280px).
5. Verifica **accesibilidad**: focus visible, aria-labels, contraste AA.

### Al modificar componente existente
1. Ejecuta `npm run lint` y `npm run typecheck`.
2. Comprueba que no rompes consistencia visual.
3. Añade/actualiza tests visuales si aplica (Playwright).

---

## Referencias rápidas

- **Tokens**: `app/globals.css` → `@theme`
- **Primitivas**: `components/ui/index.tsx`
- **Patrones**: `components/ui/index.tsx` → `Card`, `Panel`, `StatCard`, `KpiCard`
- **Animaciones**: `globals.css` → `@keyframes` (`.pulse-soft`, `.fade-in-up`, `.page-fade-in`)
- **Utilidades**: `@utility` en `globals.css` (`card`, `btn-*`, `input`, `panel`, `stat`, `empty-state`)

---

*Documento vivo — actualizar cuando evolucione el sistema de diseño.*