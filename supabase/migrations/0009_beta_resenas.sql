-- ENRENTA BETA · 0009 · Reseñas
--
-- Sin depósito en garantía, la confianza se construye con reseñas:
-- - Solo califica el cliente de una solicitud que la compañía marcó como rentada, y desde
--   la fecha de entrega (cuando ya recibió o usó el equipo). Una reseña por solicitud; la
--   puede editar.
-- - La compañía puede responder cada reseña.
-- - Cualquiera (con o sin cuenta) ve las reseñas y el promedio de cada compañía. El autor se
--   muestra con su nombre y la inicial del apellido.
--
-- Ejecutar después de 0008.

create table public.resenas (
  id            uuid primary key default gen_random_uuid(),
  reserva_id    uuid not null unique references public.reservas (id) on delete cascade,
  compania_id   uuid not null references public.companias (id) on delete cascade,
  autor         uuid not null references public.perfiles (id) on delete cascade,
  autor_nombre  text not null default '',
  estrellas     smallint not null check (estrellas between 1 and 5),
  comentario    text check (comentario is null or char_length(comentario) <= 1000),
  respuesta     text check (respuesta is null or char_length(respuesta) <= 1000),
  respondida    timestamptz,
  creado        timestamptz not null default now(),
  actualizado   timestamptz not null default now()
);
create index resenas_compania_idx on public.resenas (compania_id, creado desc);

-- "Laura Gómez Pérez" → "Laura G."
create function public.nombre_corto(p_nombre text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(btrim(p_nombre), '') = '' then 'Cliente'
    when position(' ' in btrim(p_nombre)) = 0 then btrim(p_nombre)
    else split_part(btrim(p_nombre), ' ', 1) || ' ' || upper(left(split_part(btrim(p_nombre), ' ', 2), 1)) || '.'
  end;
$$;

-- ---------------------------------------------------------------------------
-- El cliente califica (o edita su reseña de) una solicitud rentada
-- ---------------------------------------------------------------------------
create function public.dejar_resena(p_reserva uuid, p_estrellas integer, p_comentario text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r public.reservas%rowtype;
  v_comentario text := nullif(left(btrim(coalesce(p_comentario, '')), 1000), '');
begin
  select * into v_r from public.reservas r where r.id = p_reserva;
  if not found or v_r.cliente <> (select auth.uid()) then
    raise exception 'No encontramos esa solicitud.';
  end if;
  if v_r.estado not in ('confirmada', 'en_curso', 'completada') then
    raise exception 'Solo puedes calificar una solicitud que la compañía marcó como rentada.';
  end if;
  if now() < v_r.entrega then
    raise exception 'Podrás calificar a la compañía desde la fecha de entrega.';
  end if;
  if p_estrellas is null or p_estrellas not between 1 and 5 then
    raise exception 'Elige de 1 a 5 estrellas.';
  end if;

  insert into public.resenas (reserva_id, compania_id, autor, autor_nombre, estrellas, comentario)
  values (p_reserva, v_r.compania_id, (select auth.uid()), public.nombre_corto(v_r.cliente_nombre), p_estrellas, v_comentario)
  on conflict (reserva_id) do update
    set estrellas = excluded.estrellas, comentario = excluded.comentario, actualizado = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- La compañía responde una reseña (o edita su respuesta)
-- ---------------------------------------------------------------------------
create function public.responder_resena(p_resena uuid, p_texto text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_texto text := nullif(left(btrim(coalesce(p_texto, '')), 1000), '');
begin
  update public.resenas re
     set respuesta = v_texto,
         respondida = case when v_texto is null then null else now() end
   where re.id = p_resena and public.es_mi_compania(re.compania_id);
  if not found then
    raise exception 'No encontramos esa reseña.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Promedio y cantidad de reseñas por compañía (público)
-- ---------------------------------------------------------------------------
create view public.resumen_resenas
with (security_invoker = true)
as
  select re.compania_id,
         round(avg(re.estrellas)::numeric, 1) as promedio,
         count(*)::integer as total
    from public.resenas re
   group by re.compania_id;

-- ---------------------------------------------------------------------------
-- Permisos y RLS: todos leen (sin el id del autor); solo se escribe con las funciones
-- ---------------------------------------------------------------------------
revoke all on public.resenas from anon, authenticated;
grant select (id, reserva_id, compania_id, autor_nombre, estrellas, comentario, respuesta, respondida, creado, actualizado)
  on public.resenas to anon, authenticated;
grant select on public.resumen_resenas to anon, authenticated;

alter table public.resenas enable row level security;
create policy "resenas: lectura pública" on public.resenas
  for select to anon, authenticated
  using (true);

revoke execute on function public.dejar_resena(uuid, integer, text) from public, anon;
revoke execute on function public.responder_resena(uuid, text) from public, anon;
grant execute on function public.dejar_resena(uuid, integer, text) to authenticated;
grant execute on function public.responder_resena(uuid, text) to authenticated;
