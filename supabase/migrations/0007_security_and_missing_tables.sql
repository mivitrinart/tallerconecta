-- ═══════════════════════════════════════════════════════════════════════════
-- TALLER CONECTA · Migración 0007 · Seguridad y tablas faltantes
-- Corrige RLS users_update_self (sin escalada a platform_admin) y añade
-- tablas/columnas que ya existen en TypeScript pero faltaban en SQL.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Corregir users_update_self: sin with_check permite poner es_admin_plataforma = true.
drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users for update
  using (id = auth.uid())
  with check (
    es_admin_plataforma = (select es_admin_plataforma from public.users where id = auth.uid())
    and estado = (select estado from public.users where id = auth.uid())
  );

-- 2. Tabla invoices (faltaba en el esquema inicial)
create table if not exists public.invoices (
  id           uuid primary key default gen_random_uuid(),
  service_order_id uuid not null references public.service_orders (id) on delete cascade,
  estimate_id  uuid not null references public.estimates (id) on delete cascade,
  workshop_id  uuid not null references public.workshops (id) on delete cascade,
  numero       text not null,
  fecha_emision timestamptz not null default now(),
  nit_emisor   text not null,
  nombre_emisor text not null,
  documento_cliente text not null,
  nombre_cliente text not null,
  direccion_cliente text,
  medio_pago   text not null,
  subtotal     numeric(14,2) not null default 0,
  descuento    numeric(14,2) not null default 0,
  impuesto_porcentaje numeric(5,2) not null default 19,
  impuestos    numeric(14,2) not null default 0,
  total        numeric(14,2) not null default 0,
  cufe         text,
  xml          text,
  pdf_url      text,
  estado       text not null default 'borrador' check (estado in ('borrador','emitida','anulada','pagada')),
  creado_por   uuid references public.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  anulada_at   timestamptz,
  pagada_at    timestamptz
);
create index on public.invoices (workshop_id);
create index on public.invoices (estimate_id);

-- RLS para invoices
alter table public.invoices enable row level security;
create policy invoices_select on public.invoices for select
  using (workshop_id = public.current_workshop_id() or public.is_platform_admin());
create policy invoices_insert on public.invoices for insert
  with check (workshop_id = public.current_workshop_id() or public.is_platform_admin());
create policy invoices_update on public.invoices for update
  using (workshop_id = public.current_workshop_id() or public.is_platform_admin())
  with check (workshop_id = public.current_workshop_id() or public.is_platform_admin());
create policy invoices_admin_all on public.invoices for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- 3. customer_account_links: columna estado con valor por defecto 'public' y origen
-- (ya existe la tabla, asegurar columnas)
alter table public.customer_account_links
  add column if not exists estado text not null default 'pendiente' check (estado in ('pendiente','aceptado','rechazado')),
  add column if not exists origen text not null default 'public' check (origen in ('email','token','public')),
  add column if not exists created_at timestamptz not null default now();

-- 4. workshops: columnas que faltaban (enlace_publico, logo_url, google_maps_url, cupos_disponibles)
alter table public.workshops
  add column if not exists enlace_publico text,
  add column if not exists logo_url text,
  add column if not exists google_maps_url text,
  add column if not exists acepta_vehiculos boolean not null default true,
  add column if not exists cupos_disponibles int;

-- 5. users: columnas session_version y password_hash (modo demo)
alter table public.users
  add column if not exists session_version int not null default 0,
  add column if not exists password_hash text;

-- 6. customer_accounts: columna password_hash (modo demo)
alter table public.customer_accounts
  add column if not exists password_hash text;

-- ═══════════════════════════════════════════════════════════════════════════
