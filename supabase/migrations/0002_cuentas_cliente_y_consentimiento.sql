-- ═══════════════════════════════════════════════════════════════════════════
-- TALLER CONECTA · Migración 0002
-- Seguridad y aspectos legales en Colombia + cuentas de cliente
--
--  · Consentimiento de tratamiento de datos (Ley 1581 de 2012) por ficha.
--  · Anonimización (derecho de supresión) conservando historial legal.
--  · Cuentas de cliente opcionales que reúnen sus fichas por taller
--    (misma ventana de seguimiento + perfil).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Consentimiento y supresión en la ficha del cliente ─────────────────────
alter table public.customers
  add column if not exists consentimiento_datos_at timestamptz,
  add column if not exists consentimiento_origen text
    check (consentimiento_origen in ('taller','registro_cliente','enlace_personal','vinculacion_cuenta','supresion')),
  add column if not exists anonimizado boolean not null default false;

comment on column public.customers.consentimiento_datos_at is
  'Ley 1581/2012: fecha de la autorización para el tratamiento de datos personales.';
comment on column public.customers.consentimiento_origen is
  'Origen de la autorización: declarada por el taller, otorgada en la plataforma, o supresión ejercida.';
comment on column public.customers.anonimizado is
  'True tras una solicitud de supresión: contactos anonimizados, enlace personal invalidado. El historial de órdenes y autorizaciones se conserva por obligación legal.';

-- ── Cuentas de cliente (opcionales al enlace personal) ─────────────────────
create table if not exists public.customer_accounts (
  id                     uuid primary key default gen_random_uuid(),
  -- En producción se conecta con Supabase Auth; en el MVP demo la credencial
  -- la gestiona la aplicación. No se almacenan datos de tarjetas (política).
  auth_user_id           uuid references auth.users (id) on delete set null,
  nombre                 text not null,
  correo                 text not null unique,
  telefono               text not null,
  estado                 text not null default 'activo' check (estado in ('activo','eliminado')),
  consentimiento_datos_at timestamptz not null default now(),
  created_at             timestamptz not null default now()
);
comment on table public.customer_accounts is
  'Cuenta personal del cliente: reúne sus fichas por taller con la misma ventana de seguimiento + perfil. La eliminación es un borrado lógico (estado=eliminado) por el derecho de supresión.';

create table if not exists public.customer_account_links (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references public.customer_accounts (id) on delete cascade,
  customer_id  uuid not null references public.customers (id) on delete cascade,
  workshop_id  uuid not null references public.workshops (id) on delete cascade,
  origen       text not null check (origen in ('email','token')),
  created_at   timestamptz not null default now(),
  unique (customer_id),            -- una ficha pertenece a una sola cuenta
  unique (account_id, customer_id)
);
create index if not exists on public.customer_account_links (account_id);

-- ── RLS: cada cuenta solo ve lo suyo ───────────────────────────────────────
alter table public.customer_accounts      enable row level security;
alter table public.customer_account_links enable row level security;

create policy accounts_select_self on public.customer_accounts for select
  using (auth.uid() = auth_user_id or public.is_platform_admin());
create policy accounts_update_self on public.customer_accounts for update
  using (auth.uid() = auth_user_id);

create policy links_select_self on public.customer_account_links for select
  using (
    exists (
      select 1 from public.customer_accounts a
      where a.id = account_id and a.auth_user_id = auth.uid()
    ) or public.is_platform_admin()
  );
create policy links_write_self on public.customer_account_links for all
  using (
    exists (
      select 1 from public.customer_accounts a
      where a.id = account_id and a.auth_user_id = auth.uid()
    ) or public.is_platform_admin()
  )
  with check (
    exists (
      select 1 from public.customer_accounts a
      where a.id = account_id and a.auth_user_id = auth.uid()
    ) or public.is_platform_admin()
  );

-- Nota: el acceso del portal (enlace personal o cuenta) a datos operativos del
-- taller se sirve por rutas del servidor Next.js con la service_role key,
-- validando token/cuenta en cada petición. Los roles anon/authenticated no
-- tienen acceso directo a customers/service_orders (ver políticas de 0001).
