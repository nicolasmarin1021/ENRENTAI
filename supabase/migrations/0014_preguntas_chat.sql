-- ENRENTA BETA · 0014 · Preguntas por chat, sin cotizar
--
-- Antes, la conversación entre un cliente y una compañía solo aparecía con la primera solicitud.
-- Ahora el cliente puede abrirla para preguntar (por un equipo, la entrega, el técnico…) sin crear
-- una solicitud: preguntar no aparta equipos ni llena el panel de la compañía de solicitudes.
-- Se reutiliza el chat de 0006 (una conversación por pareja cliente–compañía, mensajes en tiempo
-- real) con estos cambios:
-- 1. abrir_conversacion(compañía): la crea si no existe y devuelve su id. Límite: 15 conversaciones
--    nuevas por día por cliente.
-- 2. enviar_mensaje con límites de ritmo (contra el spam): 15 mensajes por minuto y 200 por hora
--    por persona.
-- 3. Los avisos automáticos de las solicitudes usan las palabras de la BETA («Rentada»,
--    «No se concretó»).
--
-- Se puede ejecutar más de una vez. Ejecutar después de 0013.

-- ---------------------------------------------------------------------------
-- 1. Abrir (o retomar) la conversación con una compañía
-- ---------------------------------------------------------------------------
create or replace function public.abrir_conversacion(p_compania uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'Entra con tu cuenta para escribirle a la compañía.';
  end if;
  if not exists (select 1 from public.companias c where c.id = p_compania) then
    raise exception 'La compañía ya no existe.';
  end if;

  select cv.id into v_id from public.conversaciones cv where cv.cliente = v_uid and cv.compania_id = p_compania;
  if v_id is not null then
    return v_id;
  end if;

  if (select count(*) from public.conversaciones cv where cv.cliente = v_uid and cv.creado > now() - interval '1 day') >= 15 then
    raise exception 'Abriste muchas conversaciones hoy. Vuelve a intentarlo mañana.';
  end if;

  insert into public.conversaciones as cv (cliente, cliente_nombre, compania_id)
  values (v_uid, coalesce((select p.nombre from public.perfiles p where p.id = v_uid), ''), p_compania)
  on conflict (cliente, compania_id) do update set cliente_nombre = cv.cliente_nombre
  returning cv.id into v_id;
  return v_id;
end;
$$;

revoke all on function public.abrir_conversacion(uuid) from public, anon;
grant execute on function public.abrir_conversacion(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Enviar un mensaje, ahora con límites de ritmo (lo demás igual que en 0006)
-- ---------------------------------------------------------------------------
create index if not exists mensajes_autor_idx on public.mensajes (autor_id, creado desc);

create or replace function public.enviar_mensaje(p_conversacion uuid, p_lado text, p_texto text)
returns public.mensajes
language plpgsql
security definer
set search_path = ''
as $$
declare
  c       public.conversaciones;
  m       public.mensajes;
  v_uid   uuid := (select auth.uid());
  v_texto text := btrim(coalesce(p_texto, ''));
begin
  if v_uid is null then
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
     or (p_lado = 'cliente' and c.cliente <> v_uid)
     or (p_lado = 'compania' and not public.es_mi_compania(c.compania_id)) then
    raise exception 'No haces parte de esta conversación.';
  end if;

  -- Límites de ritmo (usan el índice mensajes_autor_idx).
  if (select count(*) from public.mensajes x where x.autor_id = v_uid and x.creado > now() - interval '1 minute') >= 15 then
    raise exception 'Estás enviando mensajes muy rápido. Espera un momento.';
  end if;
  if (select count(*) from public.mensajes x where x.autor_id = v_uid and x.creado > now() - interval '1 hour') >= 200 then
    raise exception 'Llegaste al máximo de mensajes por hora. Intenta más tarde.';
  end if;

  insert into public.mensajes (conversacion_id, autor, autor_id, texto)
  values (c.id, p_lado, v_uid, v_texto)
  returning * into m;

  -- Quien escribe ya leyó todo lo anterior.
  update public.conversaciones
     set leido_cliente  = case when p_lado = 'cliente'  then m.creado else leido_cliente end,
         leido_compania = case when p_lado = 'compania' then m.creado else leido_compania end
   where id = c.id;
  return m;
end;
$$;

revoke all on function public.enviar_mensaje(uuid, text, text) from public, anon;
grant execute on function public.enviar_mensaje(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Avisos automáticos de las solicitudes con las palabras de la BETA
--    (aviso_chat viene de 0007 y crea la conversación si falta)
-- ---------------------------------------------------------------------------
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
    when tg_op = 'INSERT' then 'Solicitud ' || new.codigo || ' enviada: la cotización sigue por WhatsApp.'
    when new.estado = 'confirmada' then new.codigo || ': la compañía la marcó como rentada.'
    when new.estado = 'rechazada' then new.codigo || ': la compañía la marcó como «No se concretó».'
                                        || coalesce(' Motivo: ' || new.motivo_rechazo, '')
    when new.estado = 'cancelada' then new.codigo || ' cancelada por el cliente.'
  end;
  if v_texto is not null then
    perform public.aviso_chat(new.id, v_texto);
  end if;
  return new;
end;
$$;
