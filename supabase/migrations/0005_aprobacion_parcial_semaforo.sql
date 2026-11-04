-- ═══════════════════════════════════════════════════════════════════════════
-- TALLER CONECTA · Migración 0005
-- Autorización parcial con ítems APLAZADOS + semáforo de criticidad
--
--  · "Autorizo solo frenos, no suspensión por ahora": el cliente puede
--    APLAZAR un trabajo (postergada) sin bloquear la reparación de lo aprobado.
--  · Semáforo por ítem: verde = urgente/seguridad, amarillo = recomendado
--    pronto, rojo = puede esperar. El cliente entiende por qué pagar.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.estimate_items
  add column if not exists criticidad text not null default 'recomendado'
    check (criticidad in ('urgente','recomendado','puede_esperar'));

comment on column public.estimate_items.criticidad is
  'Semáforo del presupuesto: urgente (verde/seguridad), recomendado (amarillo), puede_esperar (rojo).';

alter table public.estimate_items drop constraint if exists estimate_items_estado_check;
alter table public.estimate_items
  add constraint estimate_items_estado_check
  check (estado in ('pendiente','aprobada','rechazada','postergada'));

alter table public.estimates drop constraint if exists estimates_estado_check;
alter table public.estimates
  add constraint estimates_estado_check
  check (estado in ('borrador','enviada','aprobada','parcialmente_aprobada','rechazada','postergada','superada'));

alter table public.authorizations
  add column if not exists items_postergados uuid[] not null default '{}';

alter table public.authorizations drop constraint if exists authorizations_decision_check;
alter table public.authorizations
  add constraint authorizations_decision_check
  check (decision in ('aprobada_total','aprobada_parcial','rechazada','postergada'));

comment on column public.authorizations.items_postergados is
  'Trabajos aplazados por el cliente ("por ahora no"): no bloquean la reparación de lo aprobado; el taller puede proponerlos en una versión nueva.';
