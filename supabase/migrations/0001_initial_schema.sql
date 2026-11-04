-- ═══════════════════════════════════════════════════════════════════════════
-- TALLER CONECTA · Migración inicial del esquema (sección 6 del documento)
-- PostgreSQL / Supabase
--
-- Principios:
--  · Cada entidad tiene identificador único (uuid).
--  · Las tablas operativas incluyen workshop_id para aislar los datos de cada
--    taller mediante Row Level Security (RLS).
--  · La placa NO es clave primaria (errores de digitación, cambios de
--    matrícula, vehículos extranjeros).
--  · Mensajes, cambios de estado y autorizaciones conservan historial.
--  · Las imágenes se guardan en almacenamiento PRIVADO (bucket order-media).
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ───────────────────────────────────────────────────────────────────────────
-- Funciones auxiliares de seguridad
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select u.es_admin_plataforma from public.users u where u.id = auth.uid()),
    false
  );
$$;

create or replace function public.current_workshop_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select m.workshop_id
  from public.workshop_members m
  where m.user_id = auth.uid() and m.activo
  limit 1;
$$;

create or replace function public.current_rol()
returns text
language sql stable security definer set search_path = public
as $$
  select m.rol
  from public.workshop_members m
  where m.user_id = auth.uid() and m.activo
  limit 1;
$$;

-- Trigger genérico de updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- workshops: id, nombre, NIT opcional, dirección, teléfono, plan, estado
-- ───────────────────────────────────────────────────────────────────────────
create table public.workshops (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (length(nombre) >= 3),
  nit         text,
  direccion   text not null default '',
  ciudad      text not null default '',
  telefono    text not null,
  plan        text not null default 'starter' check (plan in ('starter','pro','premium')),
  estado      text not null default 'en_prueba' check (estado in ('activo','suspendido','en_prueba')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger workshops_touch before update on public.workshops
  for each row execute function public.touch_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- users: id, nombre, correo, teléfono, estado
-- (perfil que extiende auth.users de Supabase Auth)
-- ───────────────────────────────────────────────────────────────────────────
create table public.users (
  id                    uuid primary key references auth.users (id) on delete cascade,
  nombre                text not null,
  correo                text not null unique,
  telefono              text,
  es_admin_plataforma   boolean not null default false,
  estado                text not null default 'activo' check (estado in ('activo','inactivo','invitado')),
  created_at            timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────────────
-- workshop_members: workshop_id, user_id, rol, permisos
-- ───────────────────────────────────────────────────────────────────────────
create table public.workshop_members (
  id           uuid primary key default gen_random_uuid(),
  workshop_id  uuid not null references public.workshops (id) on delete cascade,
  user_id      uuid not null references public.users (id) on delete cascade,
  rol          text not null check (rol in ('owner','advisor','mechanic')),
  permisos     text[] not null default '{}',
  activo       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (workshop_id, user_id)
);
create index on public.workshop_members (user_id);

-- ───────────────────────────────────────────────────────────────────────────
-- customers: id, workshop_id, nombre, teléfono, correo
-- portal_token: enlace personal de acceso seguro (Módulo 5)
-- ───────────────────────────────────────────────────────────────────────────
create table public.customers (
  id            uuid primary key default gen_random_uuid(),
  workshop_id   uuid not null references public.workshops (id) on delete cascade,
  nombre        text not null,
  telefono      text not null,
  correo        text not null,
  documento     text,
  portal_token  text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at    timestamptz not null default now()
);
create index on public.customers (workshop_id);

-- ───────────────────────────────────────────────────────────────────────────
-- vehicles: id, workshop_id, customer_id, placa, tipo, marca, modelo, año, km
-- ───────────────────────────────────────────────────────────────────────────
create table public.vehicles (
  id           uuid primary key default gen_random_uuid(),
  workshop_id  uuid not null references public.workshops (id) on delete cascade,
  customer_id  uuid not null references public.customers (id) on delete cascade,
  placa        text not null,
  tipo         text not null default 'carro' check (tipo in ('carro','moto','otro')),
  marca        text not null,
  modelo       text not null,
  anio         int not null check (anio between 1950 and extract(year from now())::int + 2),
  kilometraje  int not null default 0 check (kilometraje >= 0),
  color        text,
  created_at   timestamptz not null default now(),
  unique (workshop_id, placa)   -- la placa NO es clave primaria global
);
create index on public.vehicles (customer_id);

-- ───────────────────────────────────────────────────────────────────────────
-- service_orders: id, workshop_id, customer_id, vehicle_id, número, estado,
--                 fechas, responsable
-- Los 10 estados del documento (sección 4).
-- ───────────────────────────────────────────────────────────────────────────
create table public.service_orders (
  id                      uuid primary key default gen_random_uuid(),
  workshop_id             uuid not null references public.workshops (id) on delete cascade,
  customer_id             uuid not null references public.customers (id) on delete restrict,
  vehicle_id              uuid not null references public.vehicles (id) on delete restrict,
  numero                  text,
  estado                  text not null default 'recibido' check (estado in (
                            'recibido','en_diagnostico','esperando_aprobacion','autorizado',
                            'en_reparacion','en_espera','en_pruebas','listo_entrega',
                            'entregado','cancelado')),
  motivo_ingreso          text not null,
  sintomas                text,
  fecha_ingreso           timestamptz not null default now(),
  fecha_estimada_entrega  timestamptz,          -- estimación, nunca promesa
  fecha_entrega           timestamptz,
  responsable_id          uuid references public.users (id) on delete set null,
  creado_por              uuid references public.users (id) on delete set null,
  notas_internas          text,
  valor_final             numeric(14,2) check (valor_final >= 0),
  calificacion            int check (calificacion between 1 and 5),
  calificacion_comentario text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (workshop_id, numero)
);
create index on public.service_orders (workshop_id, estado);
create index on public.service_orders (customer_id);
create index on public.service_orders (vehicle_id);
create trigger orders_touch before update on public.service_orders
  for each row execute function public.touch_updated_at();

-- Número de orden único por taller (ORD-1001, ORD-1002, …)
create or replace function public.assign_order_numero()
returns trigger language plpgsql as $$
declare
  siguiente int;
begin
  if new.numero is not null then
    return new;
  end if;
  -- lock advisory por taller para evitar colisiones de numeración
  perform pg_advisory_xact_lock(hashtext(new.workshop_id::text));
  select coalesce(max(
           nullif(regexp_replace(numero, '\D', '', 'g'), '')::int
         ), 1000) + 1
    into siguiente
    from public.service_orders
   where workshop_id = new.workshop_id;
  new.numero := 'ORD-' || siguiente;
  return new;
end;
$$;
create trigger orders_numero before insert on public.service_orders
  for each row execute function public.assign_order_numero();

-- ───────────────────────────────────────────────────────────────────────────
-- diagnostics: id, service_order_id, descripción, recomendaciones, creado_por
-- (workshop_id denormalizado para RLS sin joins)
-- ───────────────────────────────────────────────────────────────────────────
create table public.diagnostics (
  id                uuid primary key default gen_random_uuid(),
  service_order_id  uuid not null references public.service_orders (id) on delete cascade,
  workshop_id       uuid not null references public.workshops (id) on delete cascade,
  descripcion       text not null,
  recomendaciones   text not null,
  creado_por        uuid references public.users (id) on delete set null,
  created_at        timestamptz not null default now()
);
create index on public.diagnostics (service_order_id);

-- ───────────────────────────────────────────────────────────────────────────
-- estimates: id, service_order_id, versión, subtotal, impuestos, total, estado
-- Las autorizaciones se refieren a una versión concreta; si cambia el precio
-- o el alcance se crea una versión nueva que debe aprobarse de nuevo.
-- ───────────────────────────────────────────────────────────────────────────
create table public.estimates (
  id                   uuid primary key default gen_random_uuid(),
  service_order_id     uuid not null references public.service_orders (id) on delete cascade,
  workshop_id          uuid not null references public.workshops (id) on delete cascade,
  version              int not null default 1,
  subtotal             numeric(14,2) not null default 0,
  descuento            numeric(14,2) not null default 0,
  impuesto_porcentaje  numeric(5,2) not null default 19,
  impuestos            numeric(14,2) not null default 0,
  total                numeric(14,2) not null default 0,
  estado               text not null default 'borrador' check (estado in (
                         'borrador','enviada','aprobada','parcialmente_aprobada','rechazada','superada')),
  validez_dias         int not null default 15,
  creado_por           uuid references public.users (id) on delete set null,
  created_at           timestamptz not null default now(),
  enviada_at           timestamptz,
  decidida_at          timestamptz,
  unique (service_order_id, version)
);
create index on public.estimates (workshop_id, estado);

-- ───────────────────────────────────────────────────────────────────────────
-- estimate_items: id, estimate_id, tipo, descripción, cantidad, precio_unit.
-- estado por ítem: el sistema distingue trabajos aprobados de pendientes.
-- ───────────────────────────────────────────────────────────────────────────
create table public.estimate_items (
  id                     uuid primary key default gen_random_uuid(),
  estimate_id            uuid not null references public.estimates (id) on delete cascade,
  workshop_id            uuid not null references public.workshops (id) on delete cascade,
  tipo                   text not null check (tipo in ('repuesto','mano_obra','servicio','otro')),
  descripcion            text not null,
  cantidad               numeric(10,2) not null check (cantidad > 0),
  precio_unitario        numeric(14,2) not null check (precio_unitario >= 0),
  subtotal               numeric(14,2) generated always as (cantidad * precio_unitario) stored,
  estado                 text not null default 'pendiente' check (estado in ('pendiente','aprobada','rechazada')),
  requiere_autorizacion  boolean not null default true
);
create index on public.estimate_items (estimate_id);

-- ───────────────────────────────────────────────────────────────────────────
-- authorizations: id, estimate_id, decisión, usuario, fecha, versión aceptada
-- El precio autorizado se conserva aunque cambien los precios del catálogo.
-- ───────────────────────────────────────────────────────────────────────────
create table public.authorizations (
  id                 uuid primary key default gen_random_uuid(),
  estimate_id        uuid not null references public.estimates (id) on delete restrict,
  service_order_id   uuid not null references public.service_orders (id) on delete cascade,
  workshop_id        uuid not null references public.workshops (id) on delete cascade,
  version_aceptada   int not null,
  decision           text not null check (decision in ('aprobada_total','aprobada_parcial','rechazada')),
  decided_by         uuid,                     -- customer (portal) → no FK a users
  decided_by_nombre  text not null,
  monto_aprobado     numeric(14,2) not null default 0,
  items_aprobados    uuid[] not null default '{}',
  items_rechazados   uuid[] not null default '{}',
  created_at         timestamptz not null default now()
);
create index on public.authorizations (service_order_id);

-- ───────────────────────────────────────────────────────────────────────────
-- order_media: id, service_order_id, archivo, categoría, autor, fecha
-- archivo = ruta en el bucket PRIVADO order-media de Supabase Storage.
-- ───────────────────────────────────────────────────────────────────────────
create table public.order_media (
  id                uuid primary key default gen_random_uuid(),
  service_order_id  uuid not null references public.service_orders (id) on delete cascade,
  workshop_id       uuid not null references public.workshops (id) on delete cascade,
  categoria         text not null check (categoria in ('antes','durante','despues','documento','otro')),
  nombre            text not null,
  archivo           text not null,             -- ej: order-media/{workshop}/{order}/{uuid}.jpg
  autor_id          uuid references public.users (id) on delete set null,
  autor_nombre      text not null,
  visible_cliente   boolean not null default true,
  created_at        timestamptz not null default now()
);
create index on public.order_media (service_order_id);

-- ───────────────────────────────────────────────────────────────────────────
-- order_events: id, service_order_id, estado_anterior, estado_nuevo, usuario,
--               fecha  (historial inmutable de la orden)
-- ───────────────────────────────────────────────────────────────────────────
create table public.order_events (
  id                uuid primary key default gen_random_uuid(),
  service_order_id  uuid not null references public.service_orders (id) on delete cascade,
  workshop_id       uuid not null references public.workshops (id) on delete cascade,
  tipo              text not null check (tipo in (
                      'creacion','cambio_estado','diagnostico','presupuesto',
                      'autorizacion','evidencia','mensaje','nota','entrega')),
  estado_anterior   text,
  estado_nuevo      text,
  descripcion       text not null,
  actor_id          uuid,
  actor_nombre      text not null,
  created_at        timestamptz not null default now()
);
create index on public.order_events (service_order_id, created_at);

-- ───────────────────────────────────────────────────────────────────────────
-- messages: id, service_order_id, remitente, contenido, fecha, leído
-- ───────────────────────────────────────────────────────────────────────────
create table public.messages (
  id                uuid primary key default gen_random_uuid(),
  service_order_id  uuid not null references public.service_orders (id) on delete cascade,
  workshop_id       uuid not null references public.workshops (id) on delete cascade,
  remitente_tipo    text not null check (remitente_tipo in ('staff','customer')),
  remitente_id      uuid,
  remitente_nombre  text not null,
  contenido         text not null check (length(contenido) between 1 and 2000),
  leido             boolean not null default false,
  created_at        timestamptz not null default now()
);
create index on public.messages (service_order_id, created_at);
create index on public.messages (workshop_id, leido);

-- ───────────────────────────────────────────────────────────────────────────
-- notifications: id, user_id, tipo, estado, fecha, canal
-- Regla: solo se generan desde cambios reales de estado (capa de aplicación).
-- ───────────────────────────────────────────────────────────────────────────
create table public.notifications (
  id                 uuid primary key default gen_random_uuid(),
  workshop_id        uuid references public.workshops (id) on delete cascade,
  destinatario_tipo  text not null check (destinatario_tipo in ('user','customer')),
  destinatario_id    uuid not null,
  tipo               text not null,
  titulo             text not null,
  cuerpo             text not null,
  canal              text not null default 'in_app' check (canal in ('in_app','email','whatsapp')),
  estado             text not null default 'pendiente' check (estado in ('pendiente','enviada','leida','fallida')),
  link               text,
  service_order_id   uuid references public.service_orders (id) on delete cascade,
  created_at         timestamptz not null default now(),
  leida_at           timestamptz
);
create index on public.notifications (destinatario_tipo, destinatario_id, estado);

-- ───────────────────────────────────────────────────────────────────────────
-- subscriptions: id, workshop_id, plan, estado, vigencia
-- ───────────────────────────────────────────────────────────────────────────
create table public.subscriptions (
  id           uuid primary key default gen_random_uuid(),
  workshop_id  uuid not null references public.workshops (id) on delete cascade,
  plan         text not null check (plan in ('starter','pro','premium')),
  estado       text not null default 'en_prueba' check (estado in ('activa','en_prueba','vencida','cancelada')),
  inicio       date not null default current_date,
  fin          date not null,
  created_at   timestamptz not null default now(),
  check (fin > inicio)
);
create index on public.subscriptions (workshop_id);

-- ───────────────────────────────────────────────────────────────────────────
-- audit_logs: id, workshop_id, actor, acción, entidad, fecha
-- ───────────────────────────────────────────────────────────────────────────
create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  workshop_id  uuid references public.workshops (id) on delete cascade,
  actor_id     uuid,
  actor_nombre text not null,
  accion       text not null,
  entidad      text not null,
  entidad_id   text,
  detalle      jsonb,
  created_at   timestamptz not null default now()
);
create index on public.audit_logs (workshop_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY · Cada taller es un espacio privado.
-- Un empleado o cliente de un taller NUNCA puede acceder a datos de otro.
--
-- Nota: el portal del cliente (acceso por enlace personal, sin cuenta) se
-- sirve a través de rutas del servidor Next.js que consultan con la
-- service_role key validando el portal_token; el rol `anon`/`authenticated`
-- NO tiene acceso directo a las tablas de clientes.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.workshops       enable row level security;
alter table public.users           enable row level security;
alter table public.workshop_members enable row level security;
alter table public.customers       enable row level security;
alter table public.vehicles        enable row level security;
alter table public.service_orders  enable row level security;
alter table public.diagnostics     enable row level security;
alter table public.estimates       enable row level security;
alter table public.estimate_items  enable row level security;
alter table public.authorizations  enable row level security;
alter table public.order_media     enable row level security;
alter table public.order_events    enable row level security;
alter table public.messages        enable row level security;
alter table public.notifications   enable row level security;
alter table public.subscriptions   enable row level security;
alter table public.audit_logs      enable row level security;

-- users: cada usuario ve su perfil; el admin ve todos
create policy users_select on public.users for select
  using (id = auth.uid() or public.is_platform_admin());
create policy users_update_self on public.users for update
  using (id = auth.uid())
  with check (es_admin_plataforma = (select es_admin_plataforma from public.users where id = auth.uid()) and estado = (select estado from public.users where id = auth.uid()));
create policy users_admin_all on public.users for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- workshops: el personal ve/edita su taller; admin gestiona todos
create policy workshops_select on public.workshops for select
  using (id = public.current_workshop_id() or public.is_platform_admin());
create policy workshops_update on public.workshops for update
  using ((id = public.current_workshop_id() and public.current_rol() = 'owner') or public.is_platform_admin());
create policy workshops_admin_all on public.workshops for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- workshop_members: owner gestiona su equipo; miembros se ven entre sí
create policy members_select on public.workshop_members for select
  using (workshop_id = public.current_workshop_id() or user_id = auth.uid() or public.is_platform_admin());
create policy members_write on public.workshop_members for all
  using ((workshop_id = public.current_workshop_id() and public.current_rol() = 'owner') or public.is_platform_admin())
  with check ((workshop_id = public.current_workshop_id() and public.current_rol() = 'owner') or public.is_platform_admin());

-- Tablas tenant: política común por workshop_id
do $$
declare
  t text;
begin
  foreach t in array array['customers','vehicles','service_orders','diagnostics','estimates',
                           'estimate_items','authorizations','order_media','order_events',
                           'messages','notifications','subscriptions','audit_logs']
  loop
    execute format(
      'create policy %I_select on public.%I for select using (workshop_id = public.current_workshop_id() or public.is_platform_admin())',
      t, t);
    execute format(
      'create policy %I_insert on public.%I for insert with check (workshop_id = public.current_workshop_id() or public.is_platform_admin())',
      t, t);
    execute format(
      'create policy %I_update on public.%I for update using (workshop_id = public.current_workshop_id() or public.is_platform_admin())',
      t, t);
    execute format(
      'create policy %I_delete on public.%I for delete using (workshop_id = public.current_workshop_id() or public.is_platform_admin())',
      t, t);
  end loop;
end $$;

-- auditoría: solo inserción para el personal (no se puede borrar historial)
drop policy audit_logs_delete on public.audit_logs;
drop policy audit_logs_update on public.audit_logs;

-- ═══════════════════════════════════════════════════════════════════════════
-- STORAGE · Bucket privado para evidencias fotográficas
-- (ejecutar en Supabase: Storage → New bucket, o mediante el snippet abajo)
-- ═══════════════════════════════════════════════════════════════════════════
-- insert into storage.buckets (id, name, public) values ('order-media', 'order-media', false);
-- create policy "staff media" on storage.objects for all
--   using (bucket_id = 'order-media');
-- Las URLs firmadas se generan en el servidor para el portal del cliente.

-- ═══════════════════════════════════════════════════════════════════════════
-- REALTIME (opcional): actualizaciones en vivo del portal y campana
-- ═══════════════════════════════════════════════════════════════════════════
-- alter publication supabase_realtime add table public.messages, public.notifications, public.service_orders;
