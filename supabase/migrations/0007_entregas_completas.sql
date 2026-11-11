-- ENRENTA · 0007 · Entregas completas (como el prototipo)
--
-- 1. Quien registra un paso o un caso dice si lo hace como cliente o como compañía.
--    Antes la base de datos lo deducía y, si una misma cuenta era las dos cosas
--    (por ejemplo, al probar reservando tu propio equipo), nunca podía registrar la
--    salida de bodega y por eso no había dónde subir fotos.
-- 2. La devolución exige que antes se haya registrado la recepción.
-- 3. La revisión final no se puede cerrar mientras haya casos abiertos (el depósito
--    queda retenido hasta resolverlos).
-- 4. Cada paso registrado y cada caso abierto o resuelto deja un aviso en el chat.
--
-- Ejecutar después de 0001 a 0006.

-- ---------------------------------------------------------------------------
-- ¿Quien pide es esa parte de la reserva? (p_lado: 'cliente' o 'compania')
-- ---------------------------------------------------------------------------
create function public.es_parte(rid uuid, p_lado text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.reservas r
    where r.id = rid
      and ((p_lado = 'cliente' and r.cliente = (select auth.uid()))
        or (p_lado = 'compania' and public.es_mi_compania(r.compania_id)))
  );
$$;

-- El lado con el que actúa quien pide: el que pidió, si de verdad lo es; si no lo dijo, el que tenga.
create function public.lado_en_reserva(rid uuid, p_lado text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_lado in ('cliente', 'compania') then case when public.es_parte(rid, p_lado) then p_lado end
    else public.parte_de_reserva(rid)
  end;
$$;

-- ---------------------------------------------------------------------------
-- Aviso automático dentro del chat de la reserva (crea la conversación si falta).
-- ---------------------------------------------------------------------------
create function public.aviso_chat(p_reserva uuid, p_texto text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r    public.reservas%rowtype;
  v_conv uuid;
begin
  select * into v_r from public.reservas r where r.id = p_reserva;
  if not found then
    return;
  end if;
  insert into public.conversaciones as cv (cliente, cliente_nombre, compania_id)
  values (v_r.cliente, v_r.cliente_nombre, v_r.compania_id)
  on conflict (cliente, compania_id) do update set cliente_nombre = cv.cliente_nombre
  returning cv.id into v_conv;
  insert into public.mensajes (conversacion_id, autor, texto, reserva_id)
  values (v_conv, 'sistema', p_texto, p_reserva);
end;
$$;

-- Los avisos de "en curso" y "completada" ahora salen al registrar la salida y la
-- revisión final (con la cantidad de fotos), así que este disparador ya no los repite.
create or replace function public.aviso_reserva_en_chat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
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
  end;
  if v_texto is not null then
    perform public.aviso_chat(new.id, v_texto);
  end if;
  return new;
end;
$$;

-- Nombre legible de cada tipo de caso (para los avisos).
create function public.nombre_tipo_caso(p_tipo text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_tipo
    when 'dano' then 'daño en el equipo'
    when 'faltante' then 'faltante'
    when 'no_funciona' then 'el equipo no funciona'
    when 'retraso' then 'retraso en la entrega o la recogida'
    when 'cobro' then 'cobro incorrecto'
    else 'otra novedad'
  end;
$$;

-- ---------------------------------------------------------------------------
-- Registrar un paso del conducto regular (ahora con p_lado)
-- ---------------------------------------------------------------------------
drop function public.registrar_acta(uuid, text, text[], text, text[]);

create function public.registrar_acta(
  p_reserva uuid, p_paso text, p_checks text[], p_nota text, p_fotos text[], p_lado text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r       public.reservas%rowtype;
  v_lado    text := public.lado_en_reserva(p_reserva, p_lado);
  v_quien   text;
  v_acta    uuid := gen_random_uuid();
  v_hay     text[];
  v_abiertos integer;
  v_n       integer := coalesce(array_length(p_fotos, 1), 0);
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
    -- Si la cuenta también es la otra parte, actúa como la parte que corresponde.
    if public.es_parte(p_reserva, v_quien) then
      v_lado := v_quien;
    else
      raise exception 'Este paso lo registra %.', case when v_quien = 'compania' then 'la compañía' else 'el cliente' end;
    end if;
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
  if p_paso = 'devolucion' and not ('recepcion' = any (v_hay)) then
    raise exception 'Primero registra la recepción del equipo.';
  end if;
  if p_paso = 'revision' then
    if not ('devolucion' = any (v_hay)) and now() < v_r.recogida then
      raise exception 'La revisión final se hace después de la devolución o de la hora de recogida.';
    end if;
    select count(*) into v_abiertos from public.casos c where c.reserva_id = p_reserva and c.estado = 'abierto';
    if v_abiertos > 0 then
      raise exception '% en esta reserva. Resuelve los casos antes de la revisión final; mientras tanto el depósito queda retenido.',
        case when v_abiertos = 1 then 'Hay un caso abierto' else 'Hay ' || v_abiertos || ' casos abiertos' end;
    end if;
  end if;

  if v_n < 2 or v_n > 12 then
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

  perform public.aviso_chat(p_reserva, v_r.codigo || case p_paso
    when 'salida' then ': salida de bodega registrada con ' || v_n || ' fotos.'
    when 'recepcion' then ': el cliente confirmó la recepción con ' || v_n || ' fotos.'
    when 'devolucion' then ': el cliente registró la devolución con ' || v_n || ' fotos.'
    else ': revisión final registrada con ' || v_n || ' fotos. Reserva cerrada; el depósito se devuelve al cliente.'
  end);
end;
$$;

-- ---------------------------------------------------------------------------
-- Casos (ahora con p_lado)
-- ---------------------------------------------------------------------------
drop function public.abrir_caso(uuid, text, text, text[]);

create function public.abrir_caso(
  p_reserva uuid, p_tipo text, p_descripcion text, p_fotos text[], p_lado text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r      public.reservas%rowtype;
  v_lado   text := public.lado_en_reserva(p_reserva, p_lado);
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

  perform public.aviso_chat(p_reserva, 'Se abrió el caso ' || v_codigo || ' (' || public.nombre_tipo_caso(p_tipo)
    || ') en ' || v_r.codigo || '. El depósito queda retenido mientras se resuelve.');
  return v_codigo;
end;
$$;

drop function public.comentar_caso(uuid, text);

create function public.comentar_caso(p_caso uuid, p_texto text, p_lado text default null)
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
  v_lado := case when found then public.lado_en_reserva(v_c.reserva_id, p_lado) end;
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

drop function public.resolver_caso(uuid);

create function public.resolver_caso(p_caso uuid, p_lado text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c      public.casos%rowtype;
  v_lado   text;
  v_codigo text;
begin
  select * into v_c from public.casos c where c.id = p_caso for update;
  v_lado := case when found then public.lado_en_reserva(v_c.reserva_id, p_lado) end;
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

  select r.codigo into v_codigo from public.reservas r where r.id = v_c.reserva_id;
  perform public.aviso_chat(v_c.reserva_id, 'Caso ' || v_c.codigo || ' de ' || v_codigo || ' resuelto.');
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------
revoke execute on function public.es_parte(uuid, text) from public, anon;
revoke execute on function public.lado_en_reserva(uuid, text) from public, anon;
revoke execute on function public.aviso_chat(uuid, text) from public, anon, authenticated;
revoke execute on function public.registrar_acta(uuid, text, text[], text, text[], text) from public, anon;
revoke execute on function public.abrir_caso(uuid, text, text, text[], text) from public, anon;
revoke execute on function public.comentar_caso(uuid, text, text) from public, anon;
revoke execute on function public.resolver_caso(uuid, text) from public, anon;
grant execute on function public.es_parte(uuid, text) to authenticated;
grant execute on function public.lado_en_reserva(uuid, text) to authenticated;
grant execute on function public.registrar_acta(uuid, text, text[], text, text[], text) to authenticated;
grant execute on function public.abrir_caso(uuid, text, text, text[], text) to authenticated;
grant execute on function public.comentar_caso(uuid, text, text) to authenticated;
grant execute on function public.resolver_caso(uuid, text) to authenticated;
