-- ENRENTA · 0006 · Chat entre clientes y compañías
--
-- Una conversación por cada pareja cliente–compañía. Aparece sola con la primera
-- reserva entre ellos (nadie recibe mensajes de desconocidos) y cada cambio de estado
-- de una reserva deja un aviso automático dentro de la conversación.
-- Los mensajes solo se escriben con las funciones de abajo; las tablas son de lectura.
-- Ejecutar después de 0001 a 0005.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------
create table public.conversaciones (
  id              uuid primary key default gen_random_uuid(),
  cliente         uuid not null references public.perfiles (id) on delete cascade,
  cliente_nombre  text not null default '',
  compania_id     uuid not null references public.companias (id) on delete cascade,
  ultimo_texto    text,
  ultimo_autor    text check (ultimo_autor in ('cliente', 'compania', 'sistema')),
  ultimo_mensaje  timestamptz,
  leido_cliente   timestamptz not null default now(), -- hasta cuándo leyó el cliente
  leido_compania  timestamptz not null default now(), -- hasta cuándo leyó la compañía
  creado          timestamptz not null default now(),
  unique (cliente, compania_id)
);
create index conversaciones_compania_idx on public.conversaciones (compania_id);

create table public.mensajes (
  id               uuid primary key default gen_random_uuid(),
  conversacion_id  uuid not null references public.conversaciones (id) on delete cascade,
  autor            text not null check (autor in ('cliente', 'compania', 'sistema')),
  autor_id         uuid references public.perfiles (id) on delete set null,
  texto            text not null check (char_length(texto) between 1 and 2000),
  reserva_id       uuid references public.reservas (id) on delete set null, -- en los avisos
  creado           timestamptz not null default now()
);
create index mensajes_conversacion_idx on public.mensajes (conversacion_id, creado);

-- ---------------------------------------------------------------------------
-- ¿Quien pide hace parte de la conversación (como cliente o como compañía)?
-- ---------------------------------------------------------------------------
create function public.en_conversacion(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversaciones c
    where c.id = p_id
      and (c.cliente = (select auth.uid()) or public.es_mi_compania(c.compania_id))
  );
$$;

-- ---------------------------------------------------------------------------
-- Cada mensaje nuevo actualiza el resumen de la conversación (para la bandeja)
-- ---------------------------------------------------------------------------
create function public.resumir_conversacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversaciones
     set ultimo_texto = left(new.texto, 200),
         ultimo_autor = new.autor,
         ultimo_mensaje = new.creado
   where id = new.conversacion_id;
  return new;
end;
$$;

create trigger mensajes_resumen after insert on public.mensajes
  for each row execute function public.resumir_conversacion();

-- ---------------------------------------------------------------------------
-- Avisos automáticos: cada reserva nueva y cada cambio de estado
-- ---------------------------------------------------------------------------
create function public.aviso_reserva_en_chat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv  uuid;
  v_texto text;
begin
  if tg_op = 'UPDATE' and new.estado is not distinct from old.estado then
    return new;
  end if;

  v_texto := case
    when tg_op = 'INSERT' then 'Solicitud ' || new.codigo || ' enviada a la compañía.'
    when new.estado = 'confirmada' then new.codigo || ' confirmada por la compañía.'
    when new.estado = 'rechazada' then new.codigo || ' rechazada por la compañía.'
                                        || coalesce(' Motivo: ' || new.motivo_rechazo, '')
    when new.estado = 'cancelada' then new.codigo || ' cancelada por el cliente.'
    when new.estado = 'en_curso' then new.codigo || ': el equipo salió de la bodega.'
    when new.estado = 'completada' then new.codigo || ' cerrada: revisión final registrada.'
  end;
  if v_texto is null then
    return new;
  end if;

  insert into public.conversaciones as cv (cliente, cliente_nombre, compania_id)
  values (new.cliente, new.cliente_nombre, new.compania_id)
  on conflict (cliente, compania_id) do update
    set cliente_nombre = case when excluded.cliente_nombre <> '' then excluded.cliente_nombre
                              else cv.cliente_nombre end
  returning cv.id into v_conv;

  insert into public.mensajes (conversacion_id, autor, texto, reserva_id)
  values (v_conv, 'sistema', v_texto, new.id);
  return new;
end;
$$;

create trigger reservas_aviso_chat after insert or update of estado on public.reservas
  for each row execute function public.aviso_reserva_en_chat();

-- ---------------------------------------------------------------------------
-- Enviar un mensaje. p_lado dice si escribe como cliente o como compañía
-- (una misma cuenta puede ser las dos cosas).
-- ---------------------------------------------------------------------------
create function public.enviar_mensaje(p_conversacion uuid, p_lado text, p_texto text)
returns public.mensajes
language plpgsql
security definer
set search_path = ''
as $$
declare
  c       public.conversaciones;
  m       public.mensajes;
  v_texto text := btrim(coalesce(p_texto, ''));
begin
  if (select auth.uid()) is null then
    raise exception 'Entra con tu cuenta para escribir.';
  end if;
  if v_texto = '' then
    raise exception 'Escribe un mensaje.';
  end if;
  if char_length(v_texto) > 2000 then
    raise exception 'El mensaje es muy largo (máximo 2.000 caracteres).';
  end if;

  if p_lado is null or p_lado not in ('cliente', 'compania') then
    raise exception 'No haces parte de esta conversación.';
  end if;
  select * into c from public.conversaciones where id = p_conversacion;
  if not found
     or (p_lado = 'cliente' and c.cliente <> (select auth.uid()))
     or (p_lado = 'compania' and not public.es_mi_compania(c.compania_id)) then
    raise exception 'No haces parte de esta conversación.';
  end if;

  insert into public.mensajes (conversacion_id, autor, autor_id, texto)
  values (c.id, p_lado, (select auth.uid()), v_texto)
  returning * into m;

  -- Quien escribe ya leyó todo lo anterior.
  update public.conversaciones
     set leido_cliente  = case when p_lado = 'cliente'  then m.creado else leido_cliente end,
         leido_compania = case when p_lado = 'compania' then m.creado else leido_compania end
   where id = c.id;
  return m;
end;
$$;

-- ---------------------------------------------------------------------------
-- Marcar una conversación como leída
-- ---------------------------------------------------------------------------
create function public.marcar_leida(p_conversacion uuid, p_lado text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_lado = 'cliente' then
    update public.conversaciones set leido_cliente = now()
     where id = p_conversacion and cliente = (select auth.uid());
  elsif p_lado = 'compania' then
    update public.conversaciones set leido_compania = now()
     where id = p_conversacion and public.es_mi_compania(compania_id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Bandeja: mis conversaciones con su último mensaje y lo que no he leído
-- (se ejecuta con los permisos de quien pide: las reglas de abajo filtran)
-- ---------------------------------------------------------------------------
create function public.mis_conversaciones(p_lado text)
returns table (
  id                  uuid,
  cliente             uuid,
  cliente_nombre      text,
  compania_id         uuid,
  compania_nombre     text,
  compania_zona       text,
  compania_verificada boolean,
  ultimo_texto        text,
  ultimo_autor        text,
  ultimo_mensaje      timestamptz,
  leido               timestamptz,
  sin_leer            integer,
  reservas            integer
)
language sql
stable
set search_path = ''
as $$
  select c.id, c.cliente, c.cliente_nombre, c.compania_id, co.nombre, co.zona, co.verificada,
         c.ultimo_texto, c.ultimo_autor, coalesce(c.ultimo_mensaje, c.creado),
         case when p_lado = 'cliente' then c.leido_cliente else c.leido_compania end,
         (select count(*)::integer from public.mensajes m
           where m.conversacion_id = c.id
             and m.autor = case when p_lado = 'cliente' then 'compania' else 'cliente' end
             and m.creado > case when p_lado = 'cliente' then c.leido_cliente else c.leido_compania end),
         (select count(*)::integer from public.reservas r
           where r.cliente = c.cliente and r.compania_id = c.compania_id)
    from public.conversaciones c
    join public.companias co on co.id = c.compania_id
   where case when p_lado = 'cliente' then c.cliente = (select auth.uid())
              else public.es_mi_compania(c.compania_id) end
   order by coalesce(c.ultimo_mensaje, c.creado) desc;
$$;

-- Total de mensajes sin leer (para el contador de las pestañas Chats y Mensajes).
create function public.chats_sin_leer(p_lado text)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(x.sin_leer), 0)::integer from public.mis_conversaciones(p_lado) x;
$$;

-- ---------------------------------------------------------------------------
-- Conversaciones para las reservas que ya existían
-- ---------------------------------------------------------------------------
insert into public.conversaciones (cliente, cliente_nombre, compania_id, creado)
select distinct on (r.cliente, r.compania_id) r.cliente, r.cliente_nombre, r.compania_id, r.creado
  from public.reservas r
 order by r.cliente, r.compania_id, r.creado desc
on conflict (cliente, compania_id) do nothing;

-- ---------------------------------------------------------------------------
-- Permisos y reglas de acceso (RLS)
-- ---------------------------------------------------------------------------
revoke all on public.conversaciones, public.mensajes from anon, authenticated;
grant select on public.conversaciones, public.mensajes to authenticated;

revoke execute on function public.en_conversacion(uuid) from public, anon;
revoke execute on function public.resumir_conversacion() from public, anon, authenticated;
revoke execute on function public.aviso_reserva_en_chat() from public, anon, authenticated;
revoke execute on function public.enviar_mensaje(uuid, text, text) from public, anon;
revoke execute on function public.marcar_leida(uuid, text) from public, anon;
revoke execute on function public.mis_conversaciones(text) from public, anon;
revoke execute on function public.chats_sin_leer(text) from public, anon;
grant execute on function public.en_conversacion(uuid) to authenticated;
grant execute on function public.enviar_mensaje(uuid, text, text) to authenticated;
grant execute on function public.marcar_leida(uuid, text) to authenticated;
grant execute on function public.mis_conversaciones(text) to authenticated;
grant execute on function public.chats_sin_leer(text) to authenticated;

alter table public.conversaciones enable row level security;
alter table public.mensajes enable row level security;

create policy "conversaciones: el cliente y la compañía" on public.conversaciones
  for select to authenticated
  using (cliente = (select auth.uid()) or public.es_mi_compania(compania_id));

create policy "mensajes: quienes hacen parte de la conversación" on public.mensajes
  for select to authenticated
  using (public.en_conversacion(conversacion_id));

-- ---------------------------------------------------------------------------
-- Tiempo real: los mensajes nuevos llegan a la pantalla sin recargar
-- (Supabase solo entrega a cada persona los que sus reglas le dejan ver).
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.mensajes;
