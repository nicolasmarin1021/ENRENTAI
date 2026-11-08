-- ============================================================================
-- ENRENTA · Reservas (rider → solicitud → la compañía acepta o rechaza)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo → Run. Una sola vez.
--
-- Reglas que se cumplen aquí, en la base de datos (no en el navegador):
--   · Se cobra un día por cada 24 h entre entrega y recogida.
--   · Alquiler = precio × unidades × días. Base = alquiler + transporte + técnico.
--   · Servicio ENRENTA = 7 % de la base (lo paga el cliente).
--   · Depósito = % de la compañía sobre el alquiler (reembolsable).
--   · Comisión = 10 % de la base (se descuenta a la compañía).
--   · Total que paga el cliente = base + servicio + depósito.
--   · Una reserva pendiente, confirmada o en curso aparta unidades: nunca se
--     reservan más unidades de las que existen en esas fechas.
-- ============================================================================

create table public.reservas (
  id              uuid primary key default gen_random_uuid(),
  codigo          text not null unique,
  cliente         uuid not null references public.perfiles (id) on delete restrict,
  cliente_nombre  text not null default '',
  compania_id     uuid not null references public.companias (id) on delete restrict,
  estado          text not null default 'pendiente'
                    check (estado in ('pendiente', 'confirmada', 'rechazada', 'cancelada', 'en_curso', 'completada')),
  entrega         timestamptz not null,
  recogida        timestamptz not null,
  dias            integer not null check (dias >= 1),
  modalidad       text not null check (modalidad in ('entrega', 'retiro')), -- retiro = el cliente recoge en la bodega
  lugar_nombre    text not null,
  lugar_direccion text,
  lugar_lat       double precision,
  lugar_lng       double precision,
  distancia_km    numeric(7,2),
  con_tecnico     boolean not null default false,
  alquiler        integer not null,
  transporte      integer not null default 0,
  tecnico         integer not null default 0,
  servicio        integer not null,
  deposito_pct    numeric(5,2) not null,
  deposito        integer not null,
  comision        integer not null,
  total           integer not null,
  nota            text,
  motivo_rechazo  text,
  creado          timestamptz not null default now(),
  actualizado     timestamptz not null default now(),
  check (recogida > entrega)
);
create index reservas_cliente_idx  on public.reservas (cliente, creado desc);
create index reservas_compania_idx on public.reservas (compania_id, creado desc);
create index reservas_activas_idx  on public.reservas (entrega, recogida)
  where estado in ('pendiente', 'confirmada', 'en_curso');

create table public.reserva_items (
  id          uuid primary key default gen_random_uuid(),
  reserva_id  uuid not null references public.reservas (id) on delete cascade,
  equipo_id   uuid not null references public.equipos (id) on delete restrict,
  nombre      text not null,          -- copia del nombre al reservar
  cantidad    integer not null check (cantidad between 1 and 9999),
  precio_dia  integer not null check (precio_dia >= 0) -- copia del precio al reservar
);
create index reserva_items_reserva_idx on public.reserva_items (reserva_id);
create index reserva_items_equipo_idx  on public.reserva_items (equipo_id);

create trigger reservas_actualizado before update on public.reservas
  for each row execute function public.tocar_actualizado();


-- ---------------------------------------------------------------------------
-- Unidades ocupadas por equipo en un rango de fechas (el pico de uso simultáneo).
-- Solo devuelve cantidades, nunca quién reservó.
-- ---------------------------------------------------------------------------
create function public.unidades_ocupadas(p_desde timestamptz, p_hasta timestamptz, p_equipos uuid[] default null)
returns table (equipo_id uuid, ocupadas integer)
language sql
stable
security definer
set search_path = ''
as $$
  with r as (
    select ri.equipo_id,
           greatest(rv.entrega, p_desde) as a,
           least(rv.recogida, p_hasta)   as b,
           ri.cantidad
    from public.reserva_items ri
    join public.reservas rv on rv.id = ri.reserva_id
    where rv.estado in ('pendiente', 'confirmada', 'en_curso')
      and rv.entrega < p_hasta and rv.recogida > p_desde
      and (p_equipos is null or ri.equipo_id = any (p_equipos))
  )
  select x.equipo_id, max(x.s)::integer
  from (
    select p.equipo_id,
           (select sum(r2.cantidad) from r r2
             where r2.equipo_id = p.equipo_id and r2.a <= p.a and r2.b > p.a) as s
    from r p
  ) x
  group by x.equipo_id;
$$;


-- ---------------------------------------------------------------------------
-- Crear una reserva (pendiente). Calcula todo el cobro y revisa disponibilidad
-- bloqueando los equipos, para que dos personas no se lleven la misma unidad.
-- p_items: [{"equipo_id": "...", "cantidad": 2}, ...]
-- ---------------------------------------------------------------------------
create function public.crear_reserva(
  p_compania        uuid,
  p_entrega         timestamptz,
  p_recogida        timestamptz,
  p_modalidad       text,
  p_lugar_nombre    text,
  p_lugar_direccion text,
  p_lat             double precision,
  p_lng             double precision,
  p_con_tecnico     boolean,
  p_nota            text,
  p_items           jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_c         public.companias%rowtype;
  v_e         public.equipos%rowtype;
  v_it        record;
  v_dias      integer;
  v_dist      double precision;
  v_ocupadas  integer;
  v_alquiler  integer := 0;
  v_transp    integer := 0;
  v_tecnico   integer := 0;
  v_base      integer;
  v_id        uuid := gen_random_uuid();
  v_codigo    text;
begin
  if v_uid is null then
    raise exception 'Entra con tu cuenta para reservar.';
  end if;
  if p_entrega <= now() then
    raise exception 'La entrega debe ser en el futuro.';
  end if;
  if p_recogida <= p_entrega then
    raise exception 'La recogida debe ser después de la entrega.';
  end if;
  if p_modalidad not in ('entrega', 'retiro') then
    raise exception 'Elige si quieres entrega en el lugar o recoger en la bodega.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Tu rider está vacío.';
  end if;
  if coalesce(length(trim(p_lugar_nombre)), 0) < 2 then
    raise exception 'Falta el lugar del show.';
  end if;

  select * into v_c from public.companias c where c.id = p_compania;
  if not found then
    raise exception 'La compañía ya no existe.';
  end if;

  v_dias := greatest(1, ceil(extract(epoch from (p_recogida - p_entrega)) / 86400.0 - 0.000001))::integer;

  if p_lat is not null and p_lng is not null and v_c.lat is not null and v_c.lng is not null then
    v_dist := 2 * 6371 * asin(sqrt(
      power(sin(radians(p_lat - v_c.lat) / 2), 2)
      + cos(radians(v_c.lat)) * cos(radians(p_lat)) * power(sin(radians(p_lng - v_c.lng) / 2), 2)));
  end if;

  if p_modalidad = 'entrega' then
    if v_c.cobertura_km <= 0 then
      raise exception '% solo ofrece retiro en su bodega.', v_c.nombre;
    end if;
    if v_dist is null then
      raise exception 'Falta la ubicación del lugar del show.';
    end if;
    if v_dist > v_c.cobertura_km then
      raise exception '% entrega solo hasta % km y el show queda a % km.', v_c.nombre, v_c.cobertura_km, round(v_dist::numeric, 1);
    end if;
    v_transp := case
      when v_c.transporte_modo = 'fijo' then v_c.transporte_fijo
      else (round((v_c.transporte_base + v_c.transporte_km * v_dist) / 1000.0) * 1000)::integer
    end;
  end if;

  if coalesce(p_con_tecnico, false) then
    if v_c.tecnico_tarifa_dia is null then
      raise exception '% no ofrece técnico.', v_c.nombre;
    end if;
    v_tecnico := v_c.tecnico_tarifa_dia * v_dias;
  end if;

  -- Bloquea los equipos del rider (en orden, para evitar bloqueos cruzados).
  perform 1 from (
    select e.id from public.equipos e
    where e.id in (select (x ->> 'equipo_id')::uuid from jsonb_array_elements(p_items) x)
    order by e.id
    for update
  ) bloqueo;

  for v_it in
    select (x ->> 'equipo_id')::uuid as equipo_id, sum((x ->> 'cantidad')::integer) as cantidad
    from jsonb_array_elements(p_items) x
    group by 1
  loop
    if v_it.cantidad is null or v_it.cantidad < 1 then
      raise exception 'Revisa las cantidades de tu rider.';
    end if;
    select * into v_e from public.equipos e where e.id = v_it.equipo_id;
    if not found or v_e.compania_id <> p_compania or not v_e.activo then
      raise exception 'Uno de los equipos de tu rider ya no está disponible.';
    end if;
    select coalesce((select o.ocupadas from public.unidades_ocupadas(p_entrega, p_recogida, array[v_e.id]) o), 0)
      into v_ocupadas;
    if v_e.unidades - v_ocupadas < v_it.cantidad then
      raise exception 'Solo quedan % unidades libres de % en esas fechas.', greatest(v_e.unidades - v_ocupadas, 0), v_e.nombre;
    end if;
    v_alquiler := v_alquiler + v_e.precio_dia * v_it.cantidad * v_dias;
  end loop;

  loop
    v_codigo := 'EN-' || (
      select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::integer, 1), '')
      from generate_series(1, 5));
    exit when not exists (select 1 from public.reservas r where r.codigo = v_codigo);
  end loop;

  v_base := v_alquiler + v_transp + v_tecnico;

  insert into public.reservas (
    id, codigo, cliente, cliente_nombre, compania_id, entrega, recogida, dias, modalidad,
    lugar_nombre, lugar_direccion, lugar_lat, lugar_lng, distancia_km, con_tecnico,
    alquiler, transporte, tecnico, servicio, deposito_pct, deposito, comision, total, nota
  ) values (
    v_id, v_codigo, v_uid,
    coalesce((select p.nombre from public.perfiles p where p.id = v_uid), ''),
    p_compania, p_entrega, p_recogida, v_dias, p_modalidad,
    trim(p_lugar_nombre), nullif(trim(p_lugar_direccion), ''), p_lat, p_lng,
    case when v_dist is null then null else round(v_dist::numeric, 2) end,
    coalesce(p_con_tecnico, false),
    v_alquiler, v_transp, v_tecnico,
    round(v_base * 0.07)::integer,
    v_c.deposito_pct,
    round(v_alquiler * v_c.deposito_pct / 100.0)::integer,
    round(v_base * 0.10)::integer,
    v_base + round(v_base * 0.07)::integer + round(v_alquiler * v_c.deposito_pct / 100.0)::integer,
    nullif(left(trim(coalesce(p_nota, '')), 1000), '')
  );

  insert into public.reserva_items (reserva_id, equipo_id, nombre, cantidad, precio_dia)
  select v_id, e.id, e.nombre, q.cantidad, e.precio_dia
  from (
    select (x ->> 'equipo_id')::uuid as equipo_id, sum((x ->> 'cantidad')::integer) as cantidad
    from jsonb_array_elements(p_items) x
    group by 1
  ) q
  join public.equipos e on e.id = q.equipo_id;

  return jsonb_build_object('id', v_id, 'codigo', v_codigo);
end;
$$;


-- La compañía acepta o rechaza una reserva pendiente.
create function public.responder_reserva(p_id uuid, p_aceptar boolean, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r public.reservas%rowtype;
begin
  select * into v_r from public.reservas r where r.id = p_id for update;
  if not found or not public.es_mi_compania(v_r.compania_id) then
    raise exception 'No encontramos esa reserva.';
  end if;
  if v_r.estado <> 'pendiente' then
    raise exception 'Esta reserva ya fue respondida.';
  end if;
  update public.reservas r
     set estado = case when p_aceptar then 'confirmada' else 'rechazada' end,
         motivo_rechazo = case when p_aceptar then null else nullif(left(trim(coalesce(p_motivo, '')), 500), '') end
   where r.id = p_id;
end;
$$;

-- El cliente cancela una reserva pendiente o confirmada antes de la entrega.
-- (La política de reembolso llega con los pagos.)
create function public.cancelar_reserva(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r public.reservas%rowtype;
begin
  select * into v_r from public.reservas r where r.id = p_id for update;
  if not found or v_r.cliente <> (select auth.uid()) then
    raise exception 'No encontramos esa reserva.';
  end if;
  if v_r.estado not in ('pendiente', 'confirmada') or v_r.entrega <= now() then
    raise exception 'Esta reserva ya no se puede cancelar desde aquí.';
  end if;
  update public.reservas r set estado = 'cancelada' where r.id = p_id;
end;
$$;


-- ---------------------------------------------------------------------------
-- Permisos y RLS: nadie escribe reservas directamente, solo con las funciones.
-- ---------------------------------------------------------------------------
revoke all on public.reservas, public.reserva_items from anon, authenticated;
grant select on public.reservas, public.reserva_items to authenticated;

revoke execute on function public.unidades_ocupadas(timestamptz, timestamptz, uuid[]) from public;
revoke execute on function public.crear_reserva(uuid, timestamptz, timestamptz, text, text, text, double precision, double precision, boolean, text, jsonb) from public;
revoke execute on function public.responder_reserva(uuid, boolean, text) from public;
revoke execute on function public.cancelar_reserva(uuid) from public;
grant execute on function public.unidades_ocupadas(timestamptz, timestamptz, uuid[]) to anon, authenticated;
grant execute on function public.crear_reserva(uuid, timestamptz, timestamptz, text, text, text, double precision, double precision, boolean, text, jsonb) to authenticated;
grant execute on function public.responder_reserva(uuid, boolean, text) to authenticated;
grant execute on function public.cancelar_reserva(uuid) to authenticated;

alter table public.reservas      enable row level security;
alter table public.reserva_items enable row level security;

create policy "reservas: el cliente y la compañía" on public.reservas
  for select to authenticated
  using (
    cliente = (select auth.uid())
    or (select public.es_mi_compania(compania_id))
    or (select public.es_admin())
  );

create policy "items: según su reserva" on public.reserva_items
  for select to authenticated
  using (exists (select 1 from public.reservas r where r.id = reserva_id));
