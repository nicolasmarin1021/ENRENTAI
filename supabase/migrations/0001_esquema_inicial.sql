-- ============================================================================
-- ENRENTA · Esquema inicial (Fase 1: cuentas, compañías e inventario)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo este archivo → Run.
-- Se puede ejecutar una sola vez en un proyecto nuevo.
--
-- Seguridad: todas las tablas usan RLS (Row Level Security). La app solo usa la
-- clave publicable; lo que cada persona puede leer o cambiar lo deciden las
-- políticas de este archivo, no el código del navegador.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Perfiles: un registro por cada usuario de auth.users
-- ---------------------------------------------------------------------------
create table public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text not null default '',
  telefono   text,
  ciudad     text not null default 'Medellín',
  es_admin   boolean not null default false,
  creado     timestamptz not null default now()
);

-- Crea el perfil automáticamente cuando alguien se registra.
-- Solo toma el nombre de los metadatos; es_admin nunca viene del usuario.
create function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'nombre', ''), 120));
  return new;
end;
$$;

create trigger al_registrarse
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- ¿La persona que hace la petición es administradora de ENRENTA?
create function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.es_admin from public.perfiles p where p.id = (select auth.uid())),
    false
  );
$$;


-- ---------------------------------------------------------------------------
-- 2. Compañías (los que "tienen equipos")
-- ---------------------------------------------------------------------------
create table public.companias (
  id                  uuid primary key default gen_random_uuid(),
  duenio              uuid not null references public.perfiles (id) on delete cascade,
  nombre              text not null check (char_length(nombre) between 2 and 120),
  descripcion         text,
  ciudad              text not null default 'Medellín',
  zona                text,                         -- barrio o comuna, p. ej. "El Poblado"
  direccion_bodega    text,                         -- se muestra si el cliente recoge
  horario_bodega      text,
  lat                 double precision,
  lng                 double precision,
  verificada          boolean not null default false, -- solo un admin la cambia
  -- Depósito: porcentaje del valor de la renta (lo define la compañía)
  deposito_pct        numeric(5,2) not null default 30 check (deposito_pct between 0 and 100),
  cobertura_km        integer not null default 25 check (cobertura_km between 0 and 500),
  -- Transporte: valor fijo o variable por distancia (COP, sin decimales)
  transporte_modo     text not null default 'variable' check (transporte_modo in ('fijo', 'variable')),
  transporte_fijo     integer not null default 0 check (transporte_fijo >= 0),
  transporte_base     integer not null default 0 check (transporte_base >= 0),
  transporte_km       integer not null default 0 check (transporte_km >= 0),
  -- Técnico opcional que la compañía ofrece por día
  tecnico_nombre      text,
  tecnico_tarifa_dia  integer check (tecnico_tarifa_dia >= 0),
  creado              timestamptz not null default now(),
  actualizado         timestamptz not null default now()
);
create index companias_duenio_idx on public.companias (duenio);

-- ¿La compañía `cid` pertenece a quien hace la petición?
create function public.es_mi_compania(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.companias c
    where c.id = cid and c.duenio = (select auth.uid())
  );
$$;

-- Datos privados de la compañía: solo los ve su dueño (y un admin).
create table public.companias_privado (
  compania_id  uuid primary key references public.companias (id) on delete cascade,
  contacto     text,
  correo       text,
  telefono     text,
  nit          text,
  actualizado  timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- 3. Inventario
-- ---------------------------------------------------------------------------
create table public.categorias (
  id      text primary key,
  nombre  text not null,
  orden   integer not null default 0
);

insert into public.categorias (id, nombre, orden) values
  ('mic',      'Micrófonos inalámbricos', 1),
  ('iem',      'In-ear (IEM)',            2),
  ('antena',   'Antenas y distribución',  3),
  ('coord',    'Coordinación RF',         4),
  ('consola',  'Consolas',                5),
  ('pa',       'Sistemas PA',             6),
  ('monitor',  'Monitores de piso',       7),
  ('intercom', 'Intercom inalámbrico',    8);

create table public.equipos (
  id            uuid primary key default gen_random_uuid(),
  compania_id   uuid not null references public.companias (id) on delete cascade,
  categoria_id  text not null references public.categorias (id),
  nombre        text not null check (char_length(nombre) between 2 and 160),
  incluye       text,                               -- qué trae cada unidad
  unidades      integer not null default 1 check (unidades between 1 and 9999),
  precio_dia    integer not null check (precio_dia >= 0), -- COP por 24 h, lo define la compañía
  dimensiones   text,                               -- p. ej. "48 × 35 × 20 cm (case)"
  peso_kg       numeric(7,2) check (peso_kg >= 0),
  estado        text not null default 'excelente'
                  check (estado in ('nuevo', 'excelente', 'bueno', 'con_detalles')),
  -- Solo para equipos inalámbricos (opcional)
  banda_nombre  text,                               -- p. ej. "G57"
  banda_min_mhz numeric(7,3),
  banda_max_mhz numeric(7,3),
  activo        boolean not null default true,      -- inactivo = oculto del mapa
  creado        timestamptz not null default now(),
  actualizado   timestamptz not null default now(),
  check (banda_min_mhz is null or banda_max_mhz is null or banda_min_mhz < banda_max_mhz)
);
create index equipos_compania_idx  on public.equipos (compania_id);
create index equipos_categoria_idx on public.equipos (categoria_id) where activo;

-- Fotos reales del equipo. Archivo en Storage: equipos/{compania_id}/{equipo_id}/{archivo}
create table public.equipo_fotos (
  id         uuid primary key default gen_random_uuid(),
  equipo_id  uuid not null references public.equipos (id) on delete cascade,
  ruta       text not null,
  orden      integer not null default 0,
  creado     timestamptz not null default now()
);
create index equipo_fotos_equipo_idx on public.equipo_fotos (equipo_id, orden);


-- ---------------------------------------------------------------------------
-- 4. Lugares de show (los públicos los crea un admin; los clientes pueden
--    guardar los suyos con dirección exacta, visibles solo para ellos)
-- ---------------------------------------------------------------------------
create table public.lugares (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (char_length(nombre) between 2 and 160),
  direccion   text,
  ciudad      text not null default 'Medellín',
  lat         double precision,
  lng         double precision,
  creado_por  uuid references public.perfiles (id) on delete set null,
  publico     boolean not null default false,
  creado      timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- 5. Fecha de "actualizado" automática
-- ---------------------------------------------------------------------------
create function public.tocar_actualizado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado := now();
  return new;
end;
$$;

create trigger companias_actualizado before update on public.companias
  for each row execute function public.tocar_actualizado();
create trigger companias_privado_actualizado before update on public.companias_privado
  for each row execute function public.tocar_actualizado();
create trigger equipos_actualizado before update on public.equipos
  for each row execute function public.tocar_actualizado();


-- ---------------------------------------------------------------------------
-- 6. Permisos por columna
--    Se quitan los permisos por defecto y se dan solo los necesarios.
--    Así nadie puede marcarse como admin ni "verificar" su propia compañía.
-- ---------------------------------------------------------------------------
revoke all on public.perfiles, public.companias, public.companias_privado,
              public.categorias, public.equipos, public.equipo_fotos, public.lugares
  from anon, authenticated;

grant select on public.categorias, public.companias, public.equipos, public.equipo_fotos
  to anon, authenticated;

grant select on public.perfiles to authenticated;
grant update (nombre, telefono, ciudad) on public.perfiles to authenticated;

grant insert (duenio, nombre, descripcion, ciudad, zona, direccion_bodega, horario_bodega,
              lat, lng, deposito_pct, cobertura_km, transporte_modo, transporte_fijo,
              transporte_base, transporte_km, tecnico_nombre, tecnico_tarifa_dia)
  on public.companias to authenticated;
grant update (nombre, descripcion, ciudad, zona, direccion_bodega, horario_bodega,
              lat, lng, deposito_pct, cobertura_km, transporte_modo, transporte_fijo,
              transporte_base, transporte_km, tecnico_nombre, tecnico_tarifa_dia)
  on public.companias to authenticated;
grant delete on public.companias to authenticated;

grant select, insert, update, delete on public.companias_privado to authenticated;
grant insert, update, delete on public.equipos, public.equipo_fotos to authenticated;
grant select, insert, update, delete on public.lugares to authenticated;
grant select on public.lugares to anon;

grant execute on function public.es_admin(), public.es_mi_compania(uuid) to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 7. Políticas RLS
-- ---------------------------------------------------------------------------
alter table public.perfiles          enable row level security;
alter table public.companias         enable row level security;
alter table public.companias_privado enable row level security;
alter table public.categorias        enable row level security;
alter table public.equipos           enable row level security;
alter table public.equipo_fotos      enable row level security;
alter table public.lugares           enable row level security;

-- Perfiles: cada quien ve y edita el suyo.
create policy "perfil: ver el propio" on public.perfiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.es_admin()));
create policy "perfil: editar el propio" on public.perfiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Categorías: lectura pública.
create policy "categorias: lectura publica" on public.categorias
  for select to anon, authenticated using (true);

-- Compañías: perfil público para todos; solo el dueño la crea y la edita.
create policy "companias: lectura publica" on public.companias
  for select to anon, authenticated using (true);
create policy "companias: crear la propia" on public.companias
  for insert to authenticated
  with check (duenio = (select auth.uid()));
create policy "companias: editar la propia" on public.companias
  for update to authenticated
  using (duenio = (select auth.uid()) or (select public.es_admin()))
  with check (duenio = (select auth.uid()) or (select public.es_admin()));
create policy "companias: borrar la propia" on public.companias
  for delete to authenticated
  using (duenio = (select auth.uid()));

-- Datos privados: solo el dueño (y un admin).
create policy "privado: solo el duenio" on public.companias_privado
  for all to authenticated
  using ((select public.es_mi_compania(compania_id)) or (select public.es_admin()))
  with check ((select public.es_mi_compania(compania_id)) or (select public.es_admin()));

-- Equipos: los activos son públicos; el dueño ve también los inactivos.
create policy "equipos: lectura" on public.equipos
  for select to anon, authenticated
  using (activo or (select public.es_mi_compania(compania_id)));
create policy "equipos: crear en mi compania" on public.equipos
  for insert to authenticated
  with check ((select public.es_mi_compania(compania_id)));
create policy "equipos: editar en mi compania" on public.equipos
  for update to authenticated
  using ((select public.es_mi_compania(compania_id)))
  with check ((select public.es_mi_compania(compania_id)));
create policy "equipos: borrar en mi compania" on public.equipos
  for delete to authenticated
  using ((select public.es_mi_compania(compania_id)));

-- Fotos: siguen la visibilidad de su equipo.
create policy "fotos: lectura" on public.equipo_fotos
  for select to anon, authenticated
  using (exists (
    select 1 from public.equipos e
    where e.id = equipo_id and (e.activo or (select public.es_mi_compania(e.compania_id)))
  ));
create policy "fotos: gestionar las de mi compania" on public.equipo_fotos
  for all to authenticated
  using (exists (
    select 1 from public.equipos e
    where e.id = equipo_id and (select public.es_mi_compania(e.compania_id))
  ))
  with check (exists (
    select 1 from public.equipos e
    where e.id = equipo_id and (select public.es_mi_compania(e.compania_id))
  ));

-- Lugares: públicos para todos; los personales solo para quien los creó.
create policy "lugares: lectura" on public.lugares
  for select to anon, authenticated
  using (publico or creado_por = (select auth.uid()) or (select public.es_admin()));
create policy "lugares: crear los mios" on public.lugares
  for insert to authenticated
  with check ((creado_por = (select auth.uid()) and not publico) or (select public.es_admin()));
create policy "lugares: editar los mios" on public.lugares
  for update to authenticated
  using (creado_por = (select auth.uid()) or (select public.es_admin()))
  with check ((creado_por = (select auth.uid()) and not publico) or (select public.es_admin()));
create policy "lugares: borrar los mios" on public.lugares
  for delete to authenticated
  using (creado_por = (select auth.uid()) or (select public.es_admin()));


-- ---------------------------------------------------------------------------
-- 8. Storage: bucket público para las fotos del inventario (máx. 5 MB)
--    Cada compañía solo puede subir o borrar dentro de su carpeta {compania_id}/
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('equipos', 'equipos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "fotos equipos: subir a mi carpeta" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'equipos'
    and (select public.es_mi_compania(((storage.foldername(name))[1])::uuid))
  );
create policy "fotos equipos: ver mi carpeta" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'equipos'
    and (select public.es_mi_compania(((storage.foldername(name))[1])::uuid))
  );
create policy "fotos equipos: reemplazar en mi carpeta" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'equipos'
    and (select public.es_mi_compania(((storage.foldername(name))[1])::uuid))
  );
create policy "fotos equipos: borrar de mi carpeta" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'equipos'
    and (select public.es_mi_compania(((storage.foldername(name))[1])::uuid))
  );
