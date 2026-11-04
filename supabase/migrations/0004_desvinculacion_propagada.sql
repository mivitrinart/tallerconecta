-- ═══════════════════════════════════════════════════════════════════════════
-- TALLER CONECTA · Migración 0004
-- Desvinculación propagada al panel del taller
--
-- Cuando el cliente desvincula una ficha de su cuenta (o elimina la cuenta),
-- su enlace personal de seguimiento queda DESACTIVADO (portal_activo = false):
--   · El portal /seguimiento/<token> y sus APIs rechazan el enlace.
--   · El panel del taller marca la ficha ("Acceso desactivado") y puede
--     reactivar el enlace (Configuración → Portales de clientes).
--   · El cliente lo restaura volviendo a vincular el enlace desde su cuenta.
-- La ficha y su historial se conservan (obligación legal).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.customers
  add column if not exists portal_activo boolean not null default true;

comment on column public.customers.portal_activo is
  'False cuando el cliente desvinculó la ficha desde su cuenta: enlace personal desactivado. El taller puede reactivarlo; el cliente lo restaura volviendo a vincular el enlace.';

create index if not exists customers_portal_activo_idx
  on public.customers (workshop_id, portal_activo);
