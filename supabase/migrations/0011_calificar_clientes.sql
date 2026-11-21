-- ENRENTA BETA · 0011 · Las compañías califican a los clientes
--
-- La confianza va en las dos direcciones: después de rentar, la compañía califica a quien rentó
-- (de 1 a 5 estrellas) y, si algo pasó con el equipo, deja un reporte con el motivo.
-- - Solo la compañía de una solicitud que marcó como rentada, desde la fecha de entrega.
--   Una calificación por solicitud; la puede editar.
-- - Si reporta un problema, tiene que contar qué pasó.
-- - El cliente ve lo que le dejaron y puede responder (su versión).
-- - Las demás compañías ven el promedio, los reportes y las últimas calificaciones de un cliente
--   solo cuando ese cliente les pide algo (con perfil_de_solicitud). No es público.
--
-- Se puede ejecutar más de una vez. Ejecutar después de 0010.

-- 1. Tabla
create table if not exists public.calificaciones_cliente (
  id               uuid primary key default gen_random_uuid(),
  reserva_id       uuid not null unique references public.reservas (id) on delete cascade,
  cliente          uuid not null references public.perfiles (id) on delete cascade,
  compania_id      uuid not null references public.companias (id) on delete cascade,
  compania_nombre  text not null default '',
  estrellas        smallint not null check (estrellas between 1 and 5),
  comentario       text check (comentario is null or char_length(comentario) <= 1000),
  problema         text check (problema is null or problema in ('dano', 'faltante', 'retraso', 'pago', 'trato', 'otro')),
  respuesta        text check (respuesta is null or char_length(respuesta) <= 1000),
  respondida       timestamptz,
  creado           timestamptz not null default now(),
  actualizado      timestamptz not null default now()
);
create index if not exists calificaciones_cliente_idx on public.calificaciones_cliente (cliente, creado desc);
create index if not exists calificaciones_compania_idx on public.calificaciones_cliente (compania_id);

-- 2. Permisos: el cliente lee las suyas y la compañía las que escribió; se escribe solo con funciones
revoke all on public.calificaciones_cliente from anon, authenticated;
grant select on public.calificaciones_cliente to authenticated;

alter table public.calificaciones_cliente enable row level security;

drop policy if exists "calificaciones: las mías" on public.calificaciones_cliente;
create policy "calificaciones: las mías" on public.calificaciones_cliente
  for select to authenticated
  using (
    cliente = (select auth.uid())
    or (select public.es_mi_compania(compania_id))
    or (select public.es_admin())
  );

-- 3. La compañía califica (o edita su calificación de) una solicitud rentada
create or replace function public.calificar_cliente(p_reserva uuid, p_estrellas integer, p_comentario text, p_problema text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r public.reservas%rowtype;
  v_comentario text := nullif(left(btrim(coalesce(p_comentario, '')), 1000), '');
  v_problema text := nullif(btrim(coalesce(p_problema, '')), '');
begin
  select * into v_r from public.reservas r where r.id = p_reserva;
  if not found or not public.es_mi_compania(v_r.compania_id) then
    raise exception 'No encontramos esa solicitud.';
  end if;
  if v_r.estado not in ('confirmada', 'en_curso', 'completada') then
    raise exception 'Solo puedes calificar una solicitud que marcaste como rentada.';
  end if;
  if now() < v_r.entrega then
    raise exception 'Podrás calificar al cliente desde la fecha de entrega.';
  end if;
  if p_estrellas is null or p_estrellas not between 1 and 5 then
    raise exception 'Elige de 1 a 5 estrellas.';
  end if;
  if v_problema is not null and v_problema not in ('dano', 'faltante', 'retraso', 'pago', 'trato', 'otro') then
    raise exception 'Elige el motivo del problema.';
  end if;
  if v_problema is not null and v_comentario is null then
    raise exception 'Cuenta qué pasó con el equipo.';
  end if;

  insert into public.calificaciones_cliente (reserva_id, cliente, compania_id, compania_nombre, estrellas, comentario, problema)
  values (
    p_reserva, v_r.cliente, v_r.compania_id,
    coalesce((select c.nombre from public.companias c where c.id = v_r.compania_id), ''),
    p_estrellas, v_comentario, v_problema
  )
  on conflict (reserva_id) do update
    set estrellas = excluded.estrellas,
        comentario = excluded.comentario,
        problema = excluded.problema,
        actualizado = now();
end;
$$;

-- 4. El cliente responde una calificación (o edita su respuesta)
create or replace function public.responder_calificacion(p_id uuid, p_texto text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_texto text := nullif(left(btrim(coalesce(p_texto, '')), 1000), '');
begin
  update public.calificaciones_cliente ca
     set respuesta = v_texto,
         respondida = case when v_texto is null then null else now() end
   where ca.id = p_id and ca.cliente = (select auth.uid());
  if not found then
    raise exception 'No encontramos esa calificación.';
  end if;
end;
$$;

revoke all on function public.calificar_cliente(uuid, integer, text, text) from public, anon;
revoke all on function public.responder_calificacion(uuid, text) from public, anon;
grant execute on function public.calificar_cliente(uuid, integer, text, text) to authenticated;
grant execute on function public.responder_calificacion(uuid, text) to authenticated;

-- 5. El perfil de quien hizo una solicitud ahora trae también sus calificaciones de compañías
create or replace function public.perfil_de_solicitud(p_reserva uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nombre', p.nombre,
    'ocupacion', p.ocupacion,
    'empresa', p.empresa,
    'descripcion', p.descripcion,
    'ciudad', p.ciudad,
    'enlace', p.enlace,
    'foto', p.foto,
    'miembro_desde', p.creado,
    'rentas', (
      select count(*) from public.reservas r2
      where r2.cliente = p.id and r2.estado in ('confirmada', 'en_curso', 'completada')
    ),
    'calificacion', (
      select jsonb_build_object(
        'promedio', round(avg(ca.estrellas)::numeric, 1),
        'total', count(*),
        'problemas', count(*) filter (where ca.problema is not null)
      )
      from public.calificaciones_cliente ca where ca.cliente = p.id
    ),
    'calificaciones', coalesce((
      select jsonb_agg(x order by x.creado desc)
      from (
        select ca.compania_nombre as compania, ca.estrellas, ca.comentario, ca.problema, ca.respuesta, ca.creado
        from public.calificaciones_cliente ca
        where ca.cliente = p.id
        order by ca.creado desc
        limit 5
      ) x
    ), '[]'::jsonb)
  )
  from public.reservas r
  join public.perfiles p on p.id = r.cliente
  where r.id = p_reserva
    and (
      r.cliente = (select auth.uid())
      or (select public.es_mi_compania(r.compania_id))
      or (select public.es_admin())
    );
$$;

revoke all on function public.perfil_de_solicitud(uuid) from public, anon;
grant execute on function public.perfil_de_solicitud(uuid) to authenticated;
