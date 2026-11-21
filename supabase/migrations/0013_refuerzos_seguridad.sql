-- ENRENTA BETA · 0013 · Refuerzos de seguridad
--
-- 1. Las insignias de verificado no se heredan cambiando el nombre: si la identidad del cliente ya
--    está verificada (o la compañía tiene el sello Verificada), el nombre ya no se cambia desde la
--    app; solo un admin (o el SQL Editor) puede corregirlo.
-- 2. Límites a las solicitudes de cotización, para que nadie llene de spam a las compañías ni copie
--    en masa sus WhatsApp: 10 por hora y 30 por día por cliente, y hasta 5 por confirmar con la
--    misma compañía. También se limita el largo del lugar y el tamaño del rider.
-- 3. crear_reserva (la del modelo completo, con depósito y comisión) ya no se puede llamar
--    directamente: en la BETA todo pasa por crear_solicitud, que tiene los límites.
--    (Si algún día se vuelve al modelo completo, hay que volver a darle permiso.)
--
-- Se puede ejecutar más de una vez. Ejecutar después de 0012.

-- ---------------------------------------------------------------------------
-- 1. Nombres verificados
-- ---------------------------------------------------------------------------
create or replace function public.proteger_nombre_verificado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.nombre is distinct from old.nombre
     and old.identidad_verificada is not null
     and (select auth.uid()) is not null
     and not public.es_admin() then
    raise exception 'Tu nombre ya fue verificado con tu cédula. Si necesitas corregirlo, escríbenos a ENRENTA.';
  end if;
  return new;
end;
$$;

drop trigger if exists perfiles_nombre_verificado on public.perfiles;
create trigger perfiles_nombre_verificado before update of nombre on public.perfiles
  for each row execute function public.proteger_nombre_verificado();

create or replace function public.proteger_nombre_compania_verificada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.nombre is distinct from old.nombre
     and old.verificada
     and (select auth.uid()) is not null
     and not public.es_admin() then
    raise exception 'Tu compañía está verificada con su NIT. Para cambiarle el nombre, escríbenos a ENRENTA.';
  end if;
  return new;
end;
$$;

drop trigger if exists companias_nombre_verificado on public.companias;
create trigger companias_nombre_verificado before update of nombre on public.companias
  for each row execute function public.proteger_nombre_compania_verificada();

revoke execute on function public.proteger_nombre_verificado() from public, anon, authenticated;
revoke execute on function public.proteger_nombre_compania_verificada() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Pedir una cotización, ahora con límites (lo demás queda igual que en 0008)
-- ---------------------------------------------------------------------------
create or replace function public.crear_solicitud(
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
  v_uid    uuid := (select auth.uid());
  v_r      jsonb;
  v_id     uuid;
  v_wa     text;
  v_nombre text;
begin
  if v_uid is null then
    raise exception 'Entra con tu cuenta para pedir una cotización.';
  end if;

  -- Límites por cliente (usan el índice reservas_cliente_idx).
  if (select count(*) from public.reservas r where r.cliente = v_uid and r.creado > now() - interval '1 hour') >= 10 then
    raise exception 'Pediste muchas cotizaciones en poco tiempo. Espera un rato y vuelve a intentarlo.';
  end if;
  if (select count(*) from public.reservas r where r.cliente = v_uid and r.creado > now() - interval '1 day') >= 30 then
    raise exception 'Llegaste al máximo de cotizaciones por hoy. Vuelve a intentarlo mañana.';
  end if;
  if (select count(*) from public.reservas r
       where r.cliente = v_uid and r.compania_id = p_compania and r.estado = 'pendiente' and r.recogida > now()) >= 5 then
    raise exception 'Ya tienes 5 solicitudes por confirmar con esta compañía. Espera a que te respondan por WhatsApp.';
  end if;
  if char_length(coalesce(p_lugar_nombre, '')) > 160 or char_length(coalesce(p_lugar_direccion, '')) > 300 then
    raise exception 'El nombre o la dirección del lugar es demasiado largo.';
  end if;
  if jsonb_typeof(p_items) = 'array' and jsonb_array_length(p_items) > 60 then
    raise exception 'Tu rider tiene demasiados equipos para una sola solicitud.';
  end if;

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

revoke execute on function public.crear_solicitud(uuid, timestamptz, timestamptz, text, text, text, double precision, double precision, boolean, text, jsonb) from public, anon;
grant execute on function public.crear_solicitud(uuid, timestamptz, timestamptz, text, text, text, double precision, double precision, boolean, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. crear_reserva solo se usa por dentro de crear_solicitud
-- ---------------------------------------------------------------------------
revoke execute on function public.crear_reserva(uuid, timestamptz, timestamptz, text, text, text, double precision, double precision, boolean, text, jsonb) from public, anon, authenticated;
