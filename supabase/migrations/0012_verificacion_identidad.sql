-- ENRENTA BETA · 0012 · Verificación de identidad (revisión manual)
--
-- Quien quiera la insignia de verificado envía sus documentos desde la app y un admin los revisa:
-- - Cliente: foto de la cédula (frente y reverso) y una selfie sosteniéndola → "Identidad verificada".
-- - Compañía: NIT, foto del RUT o del certificado de Cámara de Comercio y de la cédula del
--   representante legal → el sello "Verificada" que ya existe (companias.verificada).
-- El admin consulta la cédula en la Registraduría y el NIT en el RUES, aprueba o rechaza con motivo
-- y la app borra las fotos al terminar. Es opcional: nadie necesita verificarse para usar ENRENTA
-- (la selfie es un dato biométrico, sensible según la Ley 1581 de 2012 y el Decreto 1377 de 2013).
-- Las fotos van a un bucket PRIVADO: solo las ven su dueño y los admins.
--
-- Se puede ejecutar más de una vez. Ejecutar después de 0011.

-- 1. El perfil guarda desde cuándo la identidad está verificada (solo lo cambia una función)
alter table public.perfiles add column if not exists identidad_verificada timestamptz;

-- 2. Solicitudes de verificación
create table if not exists public.verificaciones (
  id            uuid primary key default gen_random_uuid(),
  usuario       uuid not null references public.perfiles (id) on delete cascade,
  tipo          text not null check (tipo in ('cliente', 'compania')),
  compania_id   uuid references public.companias (id) on delete cascade,
  nit           text check (nit is null or char_length(nit) <= 20),
  archivos      text[] not null default '{}',   -- rutas en el bucket "verificaciones"
  estado        text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  motivo        text check (motivo is null or char_length(motivo) <= 300),
  acepto_datos  timestamptz not null,           -- cuándo autorizó el tratamiento de sus datos
  creado        timestamptz not null default now(),
  revisado      timestamptz,
  revisado_por  uuid references public.perfiles (id) on delete set null
);
create index if not exists verificaciones_usuario_idx on public.verificaciones (usuario, creado desc);
create unique index if not exists verificaciones_una_pendiente on public.verificaciones (usuario, tipo) where estado = 'pendiente';

revoke all on public.verificaciones from anon, authenticated;
grant select on public.verificaciones to authenticated;
alter table public.verificaciones enable row level security;

drop policy if exists "verificaciones: las mías" on public.verificaciones;
create policy "verificaciones: las mías" on public.verificaciones
  for select to authenticated
  using (usuario = (select auth.uid()) or (select public.es_admin()));

-- 3. Bucket privado para las fotos (carpeta por usuario)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verificaciones', 'verificaciones', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false;

drop policy if exists "verificaciones: subir a mi carpeta" on storage.objects;
create policy "verificaciones: subir a mi carpeta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'verificaciones' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "verificaciones: ver mi carpeta o admin" on storage.objects;
create policy "verificaciones: ver mi carpeta o admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'verificaciones' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.es_admin())));

drop policy if exists "verificaciones: borrar mi carpeta o admin" on storage.objects;
create policy "verificaciones: borrar mi carpeta o admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'verificaciones' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.es_admin())));

-- 4. Enviar una solicitud (cliente: 3 fotos · compañía: NIT y 2 fotos)
create or replace function public.solicitar_verificacion(p_tipo text, p_archivos text[], p_nit text, p_acepto boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_cid uuid;
  v_nit text := nullif(regexp_replace(coalesce(p_nit, ''), '[^0-9-]', '', 'g'), '');
  v_a text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Entra con tu correo para verificarte.';
  end if;
  if p_acepto is distinct from true then
    raise exception 'Para verificarte debes autorizar el tratamiento de tus datos.';
  end if;
  if p_tipo not in ('cliente', 'compania') then
    raise exception 'Tipo de verificación no válido.';
  end if;
  if exists (select 1 from public.verificaciones v where v.usuario = v_uid and v.tipo = p_tipo and v.estado = 'pendiente') then
    raise exception 'Ya tienes una verificación en revisión.';
  end if;

  -- Las fotos tienen que estar en la carpeta de quien las envía.
  if p_archivos is null or cardinality(p_archivos) = 0 then
    raise exception 'Faltan las fotos.';
  end if;
  foreach v_a in array p_archivos loop
    if v_a is null or v_a not like v_uid::text || '/%' or position('..' in v_a) > 0 then
      raise exception 'Hay una foto que no es tuya.';
    end if;
  end loop;

  if p_tipo = 'cliente' then
    if (select p.identidad_verificada from public.perfiles p where p.id = v_uid) is not null then
      raise exception 'Tu identidad ya está verificada.';
    end if;
    if cardinality(p_archivos) <> 3 then
      raise exception 'Envía la cédula por los dos lados y la selfie con la cédula.';
    end if;
    v_nit := null;
  else
    select c.id into v_cid from public.companias c where c.duenio = v_uid order by c.creado limit 1;
    if v_cid is null then
      raise exception 'Primero crea tu compañía.';
    end if;
    if (select c.verificada from public.companias c where c.id = v_cid) then
      raise exception 'Tu compañía ya está verificada.';
    end if;
    if v_nit is null or char_length(regexp_replace(v_nit, '\D', '', 'g')) not between 8 and 11 then
      raise exception 'Escribe el NIT de la compañía (con el dígito de verificación).';
    end if;
    if cardinality(p_archivos) <> 2 then
      raise exception 'Envía el RUT o el certificado de Cámara de Comercio y la cédula del representante legal.';
    end if;
  end if;

  insert into public.verificaciones (usuario, tipo, compania_id, nit, archivos, acepto_datos)
  values (v_uid, p_tipo, v_cid, v_nit, p_archivos, now())
  returning id into v_id;
  return v_id;
end;
$$;

-- 5. El admin aprueba o rechaza (el rechazo lleva motivo, que ve la persona)
create or replace function public.revisar_verificacion(p_id uuid, p_aprobar boolean, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.verificaciones%rowtype;
  v_motivo text := nullif(left(btrim(coalesce(p_motivo, '')), 300), '');
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede revisar verificaciones.';
  end if;
  select * into v from public.verificaciones x where x.id = p_id for update;
  if not found then
    raise exception 'No encontramos esa verificación.';
  end if;
  if v.estado <> 'pendiente' then
    raise exception 'Esa verificación ya fue revisada.';
  end if;
  if not p_aprobar and v_motivo is null then
    raise exception 'Escribe el motivo del rechazo: la persona lo verá para corregirlo.';
  end if;

  update public.verificaciones x
     set estado = case when p_aprobar then 'aprobada' else 'rechazada' end,
         motivo = case when p_aprobar then null else v_motivo end,
         archivos = '{}',            -- la app borra las fotos del bucket al terminar
         revisado = now(),
         revisado_por = (select auth.uid())
   where x.id = p_id;

  if p_aprobar and v.tipo = 'cliente' then
    update public.perfiles p set identidad_verificada = now() where p.id = v.usuario;
  elsif p_aprobar and v.tipo = 'compania' and v.compania_id is not null then
    update public.companias c set verificada = true where c.id = v.compania_id;
    insert into public.companias_privado (compania_id, nit) values (v.compania_id, v.nit)
    on conflict (compania_id) do update set nit = excluded.nit;
  end if;
end;
$$;

-- 6. Lo que el admin tiene por revisar (con el correo, por si necesita escribirle)
create or replace function public.verificaciones_pendientes()
returns table (id uuid, tipo text, usuario uuid, nombre text, correo text, compania text, nit text, archivos text[], creado timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede ver esto.';
  end if;
  return query
    select v.id, v.tipo, v.usuario, p.nombre, u.email::text, c.nombre, v.nit, v.archivos, v.creado
    from public.verificaciones v
    join public.perfiles p on p.id = v.usuario
    left join auth.users u on u.id = v.usuario
    left join public.companias c on c.id = v.compania_id
    where v.estado = 'pendiente'
    order by v.creado;
end;
$$;

revoke all on function public.solicitar_verificacion(text, text[], text, boolean) from public, anon;
revoke all on function public.revisar_verificacion(uuid, boolean, text) from public, anon;
revoke all on function public.verificaciones_pendientes() from public, anon;
grant execute on function public.solicitar_verificacion(text, text[], text, boolean) to authenticated;
grant execute on function public.revisar_verificacion(uuid, boolean, text) to authenticated;
grant execute on function public.verificaciones_pendientes() to authenticated;

-- 7. El perfil que ve la compañía en cada solicitud ahora dice si la identidad está verificada
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
    'identidad_verificada', p.identidad_verificada is not null,
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
