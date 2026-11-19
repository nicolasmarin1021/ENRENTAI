-- ENRENTA BETA · 0008 · Modelo de conexión por WhatsApp
--
-- En la BETA, ENRENTA no cobra ni recibe pagos: conecta al cliente con la compañía.
-- 1. Cada compañía tiene un WhatsApp para cotizaciones. Es privado: se entrega al
--    cliente que pide una cotización (así no se puede copiar en masa).
-- 2. "Cotizar por WhatsApp" crea una solicitud con precios de referencia (alquiler,
--    transporte y técnico), sin servicio, depósito ni comisión de ENRENTA.
-- 3. La compañía marca la solicitud como "Rentada" (confirmada) o "No se concretó"
--    (rechazada). Solo las rentadas apartan equipo en la agenda.
--
-- Ejecutar después de 0001 a 0007. El modelo completo (con pagos) vive en la rama
-- modelo-full de git y no usa este archivo.

-- ---------------------------------------------------------------------------
-- 1. WhatsApp de la compañía (solo lo ve su dueño; ver la regla de companias_privado)
-- ---------------------------------------------------------------------------
alter table public.companias_privado add column whatsapp text
  check (whatsapp is null or whatsapp ~ '^[0-9]{10,15}$');

-- Se llena con el teléfono que ya registraron: 300 123 4567 → 573001234567.
update public.companias_privado cp
   set whatsapp = case
     when length(d) = 10 and d like '3%' then '57' || d
     when length(d) between 11 and 15 then d
   end
  from (select compania_id, regexp_replace(coalesce(telefono, ''), '\D', '', 'g') as d from public.companias_privado) t
 where t.compania_id = cp.compania_id and cp.whatsapp is null;

-- ---------------------------------------------------------------------------
-- 2. Disponibilidad: solo las solicitudes rentadas (y los bloqueos) apartan equipo
-- ---------------------------------------------------------------------------
create or replace function public.unidades_ocupadas(p_desde timestamptz, p_hasta timestamptz, p_equipos uuid[] default null)
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
    where rv.estado in ('confirmada', 'en_curso')
      and rv.entrega < p_hasta and rv.recogida > p_desde
      and (p_equipos is null or ri.equipo_id = any (p_equipos))
    union all
    select b.equipo_id, greatest(b.desde, p_desde), least(b.hasta, p_hasta), b.cantidad
    from public.bloqueos b
    where b.desde < p_hasta and b.hasta > p_desde
      and (p_equipos is null or b.equipo_id = any (p_equipos))
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
-- 3. Pedir una cotización: crea la solicitud y entrega el WhatsApp de la compañía
-- ---------------------------------------------------------------------------
create function public.crear_solicitud(
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
  v_r      jsonb;
  v_id     uuid;
  v_wa     text;
  v_nombre text;
begin
  select cp.whatsapp, c.nombre into v_wa, v_nombre
    from public.companias c
    left join public.companias_privado cp on cp.compania_id = c.id
   where c.id = p_compania;
  if v_nombre is null then
    raise exception 'La compañía ya no existe.';
  end if;
  if v_wa is null then
    raise exception '% todavía no registra su WhatsApp para cotizaciones.', v_nombre;
  end if;

  -- Las mismas validaciones de siempre (fechas, cobertura, unidades libres, técnico).
  v_r := public.crear_reserva(p_compania, p_entrega, p_recogida, p_modalidad, p_lugar_nombre, p_lugar_direccion,
                              p_lat, p_lng, p_con_tecnico, p_nota, p_items);
  v_id := (v_r ->> 'id')::uuid;

  -- En la BETA el precio es de referencia: sin servicio, depósito ni comisión de ENRENTA.
  update public.reservas r
     set servicio = 0, deposito = 0, comision = 0, total = r.alquiler + r.transporte + r.tecnico
   where r.id = v_id;

  return v_r || jsonb_build_object('whatsapp', v_wa, 'compania', v_nombre);
end;
$$;

-- El WhatsApp de la compañía de una solicitud (para volver a escribirle desde "Mis solicitudes").
create function public.whatsapp_de_solicitud(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select cp.whatsapp
    from public.reservas r
    join public.companias_privado cp on cp.compania_id = r.compania_id
   where r.id = p_id and r.cliente = (select auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- 4. "Rentada" o "No se concretó". Al marcarla rentada se revisa que sigan
--    quedando unidades libres (las solicitudes pendientes no apartan equipo).
-- ---------------------------------------------------------------------------
create or replace function public.responder_reserva(p_id uuid, p_aceptar boolean, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r   public.reservas%rowtype;
  v_it  record;
begin
  select * into v_r from public.reservas r where r.id = p_id for update;
  if not found or not public.es_mi_compania(v_r.compania_id) then
    raise exception 'No encontramos esa solicitud.';
  end if;
  if v_r.estado <> 'pendiente' then
    raise exception 'Esta solicitud ya fue marcada.';
  end if;

  if p_aceptar then
    for v_it in
      select ri.equipo_id, ri.nombre, ri.cantidad, e.unidades,
             coalesce((select o.ocupadas from public.unidades_ocupadas(v_r.entrega, v_r.recogida, array[ri.equipo_id]) o), 0) as ocupadas
        from public.reserva_items ri
        join public.equipos e on e.id = ri.equipo_id
       where ri.reserva_id = p_id
    loop
      if v_it.unidades - v_it.ocupadas < v_it.cantidad then
        raise exception 'Ya no tienes suficientes % libres en esas fechas (quedan %). Revisa tu agenda antes de marcarla como rentada.',
          v_it.nombre, greatest(v_it.unidades - v_it.ocupadas, 0);
      end if;
    end loop;
  end if;

  update public.reservas r
     set estado = case when p_aceptar then 'confirmada' else 'rechazada' end,
         motivo_rechazo = case when p_aceptar then null else nullif(left(trim(coalesce(p_motivo, '')), 500), '') end
   where r.id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------
revoke execute on function public.crear_solicitud(uuid, timestamptz, timestamptz, text, text, text, double precision, double precision, boolean, text, jsonb) from public, anon;
revoke execute on function public.whatsapp_de_solicitud(uuid) from public, anon;
grant execute on function public.crear_solicitud(uuid, timestamptz, timestamptz, text, text, text, double precision, double precision, boolean, text, jsonb) to authenticated;
grant execute on function public.whatsapp_de_solicitud(uuid) to authenticated;
