-- ============================================================================
-- ENRENTA · Entregas con fotos y casos
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo → Run. Una sola vez.
--
-- Conducto regular de cada reserva (4 actas con fotos y lista de revisión):
--   1. salida      (compañía)  → la reserva pasa a "en curso"
--   2. recepcion   (cliente)
--   3. devolucion  (cliente)
--   4. revision    (compañía)  → la reserva pasa a "completada"
-- Cualquiera de las dos partes puede abrir un caso; mientras haya un caso
-- abierto, el depósito queda retenido.
-- Las fotos van en un bucket PRIVADO: solo las ven el cliente y la compañía.
-- ============================================================================

-- ¿Qué parte de la reserva es quien hace la petición? 'cliente', 'compania' o null.
create function public.parte_de_reserva(rid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when r.cliente = (select auth.uid()) then 'cliente'
    when public.es_mi_compania(r.compania_id) then 'compania'
    else null
  end
  from public.reservas r
  where r.id = rid;
$$;

create table public.actas (
  id           uuid primary key default gen_random_uuid(),
  reserva_id   uuid not null references public.reservas (id) on delete cascade,
  paso         text not null check (paso in ('salida', 'recepcion', 'devolucion', 'revision')),
  autor        uuid not null references public.perfiles (id),
  autor_nombre text not null default '',
  checks       text[] not null default '{}',
  nota         text,
  creado       timestamptz not null default now(),
  unique (reserva_id, paso)
);

create table public.acta_fotos (
  id      uuid primary key default gen_random_uuid(),
  acta_id uuid not null references public.actas (id) on delete cascade,
  ruta    text not null,
  orden   integer not null default 0
);
create index acta_fotos_acta_idx on public.acta_fotos (acta_id, orden);

create table public.casos (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique,
  reserva_id          uuid not null references public.reservas (id) on delete cascade,
  abierto_por         uuid not null references public.perfiles (id),
  abierto_por_nombre  text not null default '',
  lado                text not null check (lado in ('cliente', 'compania')),
  tipo                text not null check (tipo in ('dano', 'faltante', 'no_funciona', 'retraso', 'cobro', 'otro')),
  descripcion         text not null,
  estado              text not null default 'abierto' check (estado in ('abierto', 'resuelto')),
  creado              timestamptz not null default now(),
  resuelto            timestamptz,
  resuelto_por_nombre text
);
create index casos_reserva_idx on public.casos (reserva_id, creado);

create table public.caso_fotos (
  id      uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos (id) on delete cascade,
  ruta    text not null
);
create index caso_fotos_caso_idx on public.caso_fotos (caso_id);

create table public.caso_mensajes (
  id           uuid primary key default gen_random_uuid(),
  caso_id      uuid not null references public.casos (id) on delete cascade,
  autor        uuid not null references public.perfiles (id),
  autor_nombre text not null default '',
  texto        text not null check (char_length(texto) between 1 and 2000),
  creado       timestamptz not null default now()
);
create index caso_mensajes_caso_idx on public.caso_mensajes (caso_id, creado);


-- Nombre que se muestra: la compañía firma con su nombre, el cliente con el suyo.
create function public.nombre_de_parte(rid uuid, lado text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when lado = 'compania' then (select c.nombre from public.reservas r join public.companias c on c.id = r.compania_id where r.id = rid)
    else coalesce((select p.nombre from public.perfiles p where p.id = (select auth.uid())), '')
  end;
$$;


-- ---------------------------------------------------------------------------
-- Registrar un paso del conducto regular.
-- p_fotos: rutas ya subidas al bucket "entregas" bajo {reserva_id}/{paso}/
-- ---------------------------------------------------------------------------
create function public.registrar_acta(p_reserva uuid, p_paso text, p_checks text[], p_nota text, p_fotos text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r     public.reservas%rowtype;
  v_lado  text := public.parte_de_reserva(p_reserva);
  v_quien text;
  v_acta  uuid := gen_random_uuid();
  v_hay   text[];
begin
  select * into v_r from public.reservas r where r.id = p_reserva for update;
  if not found or v_lado is null then
    raise exception 'No encontramos esa reserva.';
  end if;
  if p_paso not in ('salida', 'recepcion', 'devolucion', 'revision') then
    raise exception 'Paso no válido.';
  end if;
  v_quien := case when p_paso in ('salida', 'revision') then 'compania' else 'cliente' end;
  if v_lado <> v_quien then
    raise exception 'Este paso lo registra %.', case when v_quien = 'compania' then 'la compañía' else 'el cliente' end;
  end if;

  select coalesce(array_agg(a.paso), '{}') into v_hay from public.actas a where a.reserva_id = p_reserva;
  if p_paso = any (v_hay) then
    raise exception 'Este paso ya fue registrado.';
  end if;

  if p_paso = 'salida' and v_r.estado <> 'confirmada' then
    raise exception 'La salida se registra cuando la reserva está confirmada.';
  end if;
  if p_paso <> 'salida' and (v_r.estado <> 'en_curso' or not ('salida' = any (v_hay))) then
    raise exception 'Primero la compañía debe registrar la salida del equipo.';
  end if;
  if p_paso = 'revision' and not ('devolucion' = any (v_hay)) and now() < v_r.recogida then
    raise exception 'La revisión final se hace después de la devolución o de la hora de recogida.';
  end if;

  if coalesce(array_length(p_fotos, 1), 0) < 2 or array_length(p_fotos, 1) > 12 then
    raise exception 'Agrega entre 2 y 12 fotos del equipo.';
  end if;
  if exists (select 1 from unnest(p_fotos) f where f not like (p_reserva::text || '/' || p_paso || '/%')) then
    raise exception 'Las fotos no corresponden a esta reserva.';
  end if;

  insert into public.actas (id, reserva_id, paso, autor, autor_nombre, checks, nota)
  values (v_acta, p_reserva, p_paso, (select auth.uid()), public.nombre_de_parte(p_reserva, v_lado),
          coalesce(p_checks, '{}'), nullif(left(trim(coalesce(p_nota, '')), 1000), ''));

  insert into public.acta_fotos (acta_id, ruta, orden)
  select v_acta, f.ruta, f.n - 1 from unnest(p_fotos) with ordinality as f(ruta, n);

  if p_paso = 'salida' then
    update public.reservas r set estado = 'en_curso' where r.id = p_reserva;
  elsif p_paso = 'revision' then
    update public.reservas r set estado = 'completada' where r.id = p_reserva;
  end if;
end;
$$;


-- ---------------------------------------------------------------------------
-- Casos
-- ---------------------------------------------------------------------------
create function public.abrir_caso(p_reserva uuid, p_tipo text, p_descripcion text, p_fotos text[])
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r      public.reservas%rowtype;
  v_lado   text := public.parte_de_reserva(p_reserva);
  v_id     uuid := gen_random_uuid();
  v_codigo text;
begin
  select * into v_r from public.reservas r where r.id = p_reserva;
  if not found or v_lado is null then
    raise exception 'No encontramos esa reserva.';
  end if;
  if v_r.estado not in ('confirmada', 'en_curso', 'completada') then
    raise exception 'Solo se abren casos en reservas confirmadas, en curso o completadas.';
  end if;
  if p_tipo not in ('dano', 'faltante', 'no_funciona', 'retraso', 'cobro', 'otro') then
    raise exception 'Elige el tipo de novedad.';
  end if;
  if coalesce(length(trim(p_descripcion)), 0) < 10 then
    raise exception 'Cuéntanos qué pasó (al menos 10 caracteres).';
  end if;
  if coalesce(array_length(p_fotos, 1), 0) > 12 then
    raise exception 'Máximo 12 fotos por caso.';
  end if;
  if exists (select 1 from unnest(coalesce(p_fotos, '{}')) f where f not like (p_reserva::text || '/casos/%')) then
    raise exception 'Las fotos no corresponden a esta reserva.';
  end if;

  loop
    v_codigo := 'CS-' || (
      select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::integer, 1), '')
      from generate_series(1, 5));
    exit when not exists (select 1 from public.casos c where c.codigo = v_codigo);
  end loop;

  insert into public.casos (id, codigo, reserva_id, abierto_por, abierto_por_nombre, lado, tipo, descripcion)
  values (v_id, v_codigo, p_reserva, (select auth.uid()), public.nombre_de_parte(p_reserva, v_lado), v_lado, p_tipo,
          left(trim(p_descripcion), 2000));

  insert into public.caso_fotos (caso_id, ruta)
  select v_id, f from unnest(coalesce(p_fotos, '{}')) f;

  return v_codigo;
end;
$$;

create function public.comentar_caso(p_caso uuid, p_texto text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c    public.casos%rowtype;
  v_lado text;
begin
  select * into v_c from public.casos c where c.id = p_caso;
  v_lado := case when found then public.parte_de_reserva(v_c.reserva_id) end;
  if v_lado is null and not public.es_admin() then
    raise exception 'No encontramos ese caso.';
  end if;
  if coalesce(length(trim(p_texto)), 0) = 0 then
    raise exception 'Escribe tu mensaje.';
  end if;
  insert into public.caso_mensajes (caso_id, autor, autor_nombre, texto)
  values (p_caso, (select auth.uid()),
          case when v_lado is null then 'ENRENTA' else public.nombre_de_parte(v_c.reserva_id, v_lado) end,
          left(trim(p_texto), 2000));
end;
$$;

create function public.resolver_caso(p_caso uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c    public.casos%rowtype;
  v_lado text;
begin
  select * into v_c from public.casos c where c.id = p_caso for update;
  v_lado := case when found then public.parte_de_reserva(v_c.reserva_id) end;
  if v_lado is null and not public.es_admin() then
    raise exception 'No encontramos ese caso.';
  end if;
  if v_c.estado = 'resuelto' then
    raise exception 'Este caso ya está resuelto.';
  end if;
  update public.casos c
     set estado = 'resuelto', resuelto = now(),
         resuelto_por_nombre = case when v_lado is null then 'ENRENTA' else public.nombre_de_parte(v_c.reserva_id, v_lado) end
   where c.id = p_caso;
end;
$$;


-- ---------------------------------------------------------------------------
-- Permisos y RLS: lectura solo para las partes; escritura solo con funciones.
-- ---------------------------------------------------------------------------
revoke all on public.actas, public.acta_fotos, public.casos, public.caso_fotos, public.caso_mensajes from anon, authenticated;
grant select on public.actas, public.acta_fotos, public.casos, public.caso_fotos, public.caso_mensajes to authenticated;

revoke execute on function public.parte_de_reserva(uuid) from public;
revoke execute on function public.nombre_de_parte(uuid, text) from public;
revoke execute on function public.registrar_acta(uuid, text, text[], text, text[]) from public;
revoke execute on function public.abrir_caso(uuid, text, text, text[]) from public;
revoke execute on function public.comentar_caso(uuid, text) from public;
revoke execute on function public.resolver_caso(uuid) from public;
grant execute on function public.parte_de_reserva(uuid) to authenticated;
grant execute on function public.registrar_acta(uuid, text, text[], text, text[]) to authenticated;
grant execute on function public.abrir_caso(uuid, text, text, text[]) to authenticated;
grant execute on function public.comentar_caso(uuid, text) to authenticated;
grant execute on function public.resolver_caso(uuid) to authenticated;

alter table public.actas         enable row level security;
alter table public.acta_fotos    enable row level security;
alter table public.casos         enable row level security;
alter table public.caso_fotos    enable row level security;
alter table public.caso_mensajes enable row level security;

create policy "actas: las partes" on public.actas
  for select to authenticated
  using ((select public.parte_de_reserva(reserva_id)) is not null or (select public.es_admin()));
create policy "acta_fotos: las partes" on public.acta_fotos
  for select to authenticated
  using (exists (select 1 from public.actas a where a.id = acta_id));
create policy "casos: las partes" on public.casos
  for select to authenticated
  using ((select public.parte_de_reserva(reserva_id)) is not null or (select public.es_admin()));
create policy "caso_fotos: las partes" on public.caso_fotos
  for select to authenticated
  using (exists (select 1 from public.casos c where c.id = caso_id));
create policy "caso_mensajes: las partes" on public.caso_mensajes
  for select to authenticated
  using (exists (select 1 from public.casos c where c.id = caso_id));


-- ---------------------------------------------------------------------------
-- Storage: bucket privado "entregas" (máx. 5 MB, JPG/PNG/WebP).
-- Ruta: {reserva_id}/{paso}/{archivo} o {reserva_id}/casos/{archivo}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('entregas', 'entregas', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "entregas: subir las partes" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'entregas'
    and (select public.parte_de_reserva(((storage.foldername(name))[1])::uuid)) is not null
  );
create policy "entregas: ver las partes" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'entregas'
    and (
      (select public.parte_de_reserva(((storage.foldername(name))[1])::uuid)) is not null
      or (select public.es_admin())
    )
  );
