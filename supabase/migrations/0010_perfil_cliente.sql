-- ENRENTA BETA · 0010 · Perfil del cliente
--
-- Para que las compañías confíen en quién les pide equipo, el cliente puede completar su perfil:
-- foto, a qué se dedica, dónde trabaja, ciudad, una descripción breve y un enlace (Instagram o web).
-- - Cada persona edita solo su perfil (como antes).
-- - Una compañía ve el perfil de quien le pidió una solicitud (y nadie más), junto con desde cuándo
--   está en ENRENTA y cuántas rentas lleva. Se lee con la función perfil_de_solicitud(id).
-- - Las fotos de perfil van en el bucket público "avatares", en la carpeta {id de la persona}/.
--
-- Se puede ejecutar más de una vez. Ejecutar después de 0009.

-- 1. Campos nuevos del perfil
alter table public.perfiles
  add column if not exists ocupacion   text check (ocupacion is null or char_length(ocupacion) <= 60),
  add column if not exists empresa     text check (empresa is null or char_length(empresa) <= 100),
  add column if not exists descripcion text check (descripcion is null or char_length(descripcion) <= 300),
  add column if not exists enlace      text check (enlace is null or char_length(enlace) <= 200),
  add column if not exists foto        text check (foto is null or char_length(foto) <= 300);

grant update (nombre, telefono, ciudad, ocupacion, empresa, descripcion, enlace, foto) on public.perfiles to authenticated;

-- 2. El perfil de quien hizo una solicitud: lo ve la compañía de esa solicitud, el propio cliente
--    y el administrador. Devuelve null si no hay permiso.
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
    )
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

-- 3. Fotos de perfil: bucket público (máx. 5 MB). Cada persona solo sube o borra en su carpeta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "avatares: subir a mi carpeta" on storage.objects;
create policy "avatares: subir a mi carpeta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatares: ver mi carpeta" on storage.objects;
create policy "avatares: ver mi carpeta" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatares: borrar de mi carpeta" on storage.objects;
create policy "avatares: borrar de mi carpeta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
