-- ═══════════════════════════════════════════════════════════════════════════
-- TALLER CONECTA · Migración 0008 · Hardening de seguridad (PL/pgSQL)
--
-- Capas añadidas sobre el esquema inicial:
--   1. Funciones de seguridad re-definidas con search_path fijo (public, pg_temp)
--      para impedir ataques de "search_path hijacking".
--   2. FORCE ROW LEVEL SECURITY en todas las tablas con datos de clientes.
--   3. Auditoría automática: tabla security_audit_log + trigger PL/pgSQL que
--      registra QUIÉN (auth.uid()) cambió QUÉ en tablas sensibles.
--   4. Trigger anti-escalada: un miembro no puede darse a sí mismo el rol
--      'owner' ni desactivar al propietario.
--   5. Permisos mínimos: se revoca todo a anon y se otorgan sólo las
--      operaciones que las políticas RLS filtran por taller.
--   6. Vista pública de usuarios SIN hash de contraseña.
--   7. Índices de seguridad para consultas de autenticación y tokens.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Funciones seguras con search_path inmutable
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce(
    (select u.es_admin_plataforma from public.users u where u.id = auth.uid()),
    false
  );
$$;

create or replace function public.current_workshop_id()
returns uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select m.workshop_id
  from public.workshop_members m
  where m.user_id = auth.uid() and m.activo
  limit 1;
$$;

create or replace function public.current_rol()
returns text
language sql stable security definer set search_path = public, pg_temp
as $$
  select m.rol
  from public.workshop_members m
  where m.user_id = auth.uid() and m.activo
  limit 1;
$$;

-- Re-vocar ejecución pública de las funciones auxiliares (defensa en profundidad)
revoke execute on function public.is_platform_admin() from public;
revoke execute on function public.current_workshop_id() from public;
revoke execute on function public.current_rol() from public;
grant execute on function public.is_platform_admin() to authenticated, service_role;
grant execute on function public.current_workshop_id() to authenticated, service_role;
grant execute on function public.current_rol() to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. FORCE ROW LEVEL SECURITY (el dueño de la tabla también queda sujeto a RLS)
-- ───────────────────────────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'workshops','users','workshop_members','customers','customer_accounts',
    'customer_account_links','vehicles','service_orders','diagnostics',
    'estimates','estimate_items','authorizations','invoices','order_media',
    'order_events','messages','notifications','subscriptions','audit_logs',
    'email_verification_codes'
  ] loop
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Auditoría automática de cambios en tablas sensibles
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.security_audit_log (
  id           bigint generated always as identity primary key,
  tabla        text not null,
  operacion    text not null check (operacion in ('INSERT','UPDATE','DELETE')),
  fila_id      text,
  actor_id     uuid,
  actor_rol    text,
  detalle      jsonb not null default '{}'::jsonb,
  ip           text,
  created_at   timestamptz not null default now()
);

-- Solo el rol de servicio puede leer/escribir la auditoría (la app usa service_role)
alter table public.security_audit_log enable row level security;
create policy security_audit_log_service on public.security_audit_log for all
  to service_role using (true) with check (true);

create or replace function public.registrar_auditoria_seguridad()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  insert into public.security_audit_log (tabla, operacion, fila_id, actor_id, actor_rol, detalle)
  values (
    tg_table_name,
    tg_op,
    coalesce((to_jsonb(new) ->> 'id'), (to_jsonb(old) ->> 'id')),
    auth.uid(),
    public.current_rol(),
    case
      when tg_op = 'DELETE' then to_jsonb(old)
      when tg_op = 'UPDATE' then jsonb_build_object('antes', to_jsonb(old), 'despues', to_jsonb(new))
      else to_jsonb(new)
    end
  );
  return coalesce(new, old);
end;
$$;

do $$
declare r record;
begin
  for r in select unnest(array['customers','service_orders','authorizations','invoices','workshop_members','customer_accounts']) as tabla loop
    execute format('drop trigger if exists trg_audit_%I on public.%I', r.tabla, r.tabla);
    execute format(
      'create trigger trg_audit_%I after insert or update or delete on public.%I
       for each row execute function public.registrar_auditoria_seguridad()',
      r.tabla, r.tabla
    );
  end loop;
end $$;

-- Función para que la aplicación registre eventos de seguridad propios
-- (login fallido, rate limit, cambio de contraseña, etc.)
create or replace function public.registrar_evento_seguridad(
  p_evento text,
  p_detalle jsonb default '{}'::jsonb,
  p_entidad text default null,
  p_entidad_id text default null
)
returns void
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  insert into public.security_audit_log (tabla, operacion, fila_id, actor_id, actor_rol, detalle)
  values (
    coalesce(p_entidad, 'sistema'),
    'EVENTO',
    p_entidad_id,
    auth.uid(),
    public.current_rol(),
    jsonb_build_object('evento', p_evento) || coalesce(p_detalle, '{}'::jsonb)
  );
end;
$$;
revoke execute on function public.registrar_evento_seguridad(text, jsonb, text, text) from public;
grant execute on function public.registrar_evento_seguridad(text, jsonb, text, text) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Anti-escalada de privilegios en workshop_members
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.verificar_cambio_miembro()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  -- Nadie (salvo admin de plataforma) puede otorgarse 'owner' ni tocar al owner
  if not public.is_platform_admin() then
    if new.rol = 'owner' and (tg_op = 'INSERT' or old.rol <> 'owner') then
      raise exception 'Solo un administrador de plataforma puede asignar el rol owner';
    end if;
    if tg_op = 'UPDATE' and old.rol = 'owner' and (new.rol <> 'owner' or new.activo = false) then
      raise exception 'El propietario del taller no puede ser degradado ni desactivado';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_anti_escalada on public.workshop_members;
create trigger trg_anti_escalada before insert or update on public.workshop_members
  for each row execute function public.verificar_cambio_miembro();

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Permisos mínimos: anon no toca nada; authenticated sólo lo que RLS permite
-- ───────────────────────────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'workshops','users','workshop_members','customers','customer_accounts',
    'customer_account_links','vehicles','service_orders','diagnostics',
    'estimates','estimate_items','authorizations','invoices','order_media',
    'order_events','messages','notifications','subscriptions','audit_logs'
  ] loop
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

revoke all on public.email_verification_codes from anon, authenticated;
grant select, insert, update on public.email_verification_codes to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Vista de usuarios sin datos sensibles de autenticación
-- ───────────────────────────────────────────────────────────────────────────

create or replace view public.vw_usuarios_publicos with (security_invoker = true) as
select id, nombre, correo, telefono, estado, avatar_url, es_admin_plataforma, created_at
from public.users;

revoke all on public.vw_usuarios_publicos from anon;
grant select on public.vw_usuarios_publicos to authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 7. Índices de seguridad y rendimiento
-- ───────────────────────────────────────────────────────────────────────────

create index if not exists idx_users_correo on public.users (lower(correo));
create index if not exists idx_customers_portal_token on public.customers (portal_token);
create index if not exists idx_audit_logs_actor on public.audit_logs (actor_id, created_at desc);
create index if not exists idx_security_audit_log_created on public.security_audit_log (created_at desc);
create index if not exists idx_email_verification_codes_expira on public.email_verification_codes (expires_at);
