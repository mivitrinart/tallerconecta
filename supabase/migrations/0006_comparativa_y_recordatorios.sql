-- ═══════════════════════════════════════════════════════════════════════════
-- TALLER CONECTA · Migración 0006
-- 1) Presupuesto con comparativa original/homologado (poder de decisión del
--    cliente + ticket más alto): alternativa por ítem y recomendación del taller.
-- 2) Recordatorios automáticos de mantenimiento (retención): fecha del último
--    aviso por vehículo (regla: 3+ meses desde el último servicio, máx. 1/30 días).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.estimate_items
  add column if not exists alternativa_descripcion text,
  add column if not exists alternativa_precio_unitario numeric(14,2)
    check (alternativa_precio_unitario is null or alternativa_precio_unitario >= 0),
  add column if not exists taller_recomienda text
    check (taller_recomienda is null or taller_recomienda in ('principal','alternativa'));

comment on column public.estimate_items.alternativa_descripcion is
  'Opción homologada/más económica para el mismo trabajo (ej: "Bujías NGK LZKR").';
comment on column public.estimate_items.taller_recomienda is
  'Qué opción recomienda el taller; el cliente decide y su elección queda registrada.';

alter table public.authorizations
  add column if not exists items_con_alternativa uuid[] not null default '{}';

comment on column public.authorizations.items_con_alternativa is
  'Ítems aprobados eligiendo la alternativa (homologado). El monto aprobado usa esos precios.';

alter table public.vehicles
  add column if not exists ultimo_recordatorio_mant_at timestamptz;

comment on column public.vehicles.ultimo_recordatorio_mant_at is
  'Retención: último recordatorio automático de mantenimiento enviado al cliente (no repetir antes de 30 días).';

create index if not exists vehicles_recordatorio_idx
  on public.vehicles (workshop_id, ultimo_recordatorio_mant_at);
