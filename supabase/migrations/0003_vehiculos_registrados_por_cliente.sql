-- ═══════════════════════════════════════════════════════════════════════════
-- TALLER CONECTA · Migración 0003
-- Vehículos registrados por el cliente desde su cuenta
--
-- El cliente puede aportar la información del carro/moto que usa desde
-- /cuenta; el taller la ve en su panel marcada como "registrado por el
-- cliente" (origen del dato), y la verifica en la recepción del vehículo.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.vehicles
  add column if not exists origen text not null default 'taller'
    check (origen in ('taller','cliente')),
  add column if not exists registrado_por_account_id uuid
    references public.customer_accounts (id) on delete set null;

comment on column public.vehicles.origen is
  'Quién registró el vehículo: "taller" (personal) o "cliente" (el propio cliente desde su cuenta).';
comment on column public.vehicles.registrado_por_account_id is
  'Cuenta de cliente que registró el vehículo (solo origen = cliente).';

-- RLS: las cuentas de cliente pueden INSERTAR/UPDATE sus propios vehículos a
-- través del servidor (service role) validando la vinculación; además se
-- permite lectura de los vehículos de sus fichas vinculadas para la vista
-- "Mis vehículos" cuando la cuenta opera con su auth.uid().
create policy vehicles_select_linked_account on public.vehicles for select
  using (
    exists (
      select 1
      from public.customer_account_links l
      join public.customer_accounts a on a.id = l.account_id
      where l.customer_id = vehicles.customer_id
        and a.auth_user_id = auth.uid()
        and a.estado = 'activo'
    )
  );

-- Índice para el filtro "registrados por clientes" del panel del taller
create index if not exists vehicles_workshop_origen_idx
  on public.vehicles (workshop_id, origen);
