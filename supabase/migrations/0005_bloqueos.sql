-- ============================================================================
-- ENRENTA · Bloqueos de unidades (mantenimiento o uso propio)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo → Run. Una sola vez.
--
-- Una compañía puede apartar unidades de un equipo por unas fechas. Esas
-- unidades dejan de estar disponibles para los clientes, igual que una reserva.
-- ============================================================================

create table public.bloqueos (
  id         uuid primary key default gen_random_uuid(),
  equipo_id  uuid not null references public.equipos (id) on delete cascade,
  cantidad   integer not null check (cantidad between 1 and 9999),
  desde      timestamptz not null,
  hasta      timestamptz not null,
  motivo     text not null default 'Mantenimiento' check (char_length(motivo) between 2 and 120),
  creado     timestamptz not null default now(),
  check (hasta > desde)
);
create index bloqueos_equipo_idx on public.bloqueos (equipo_id, desde, hasta);

revoke all on public.bloqueos from anon, authenticated;
grant select, insert, delete on public.bloqueos to authenticated;

alter table public.bloqueos enable row level security;

create policy "bloqueos: los de mi compañía" on public.bloqueos
  for all to authenticated
  using (exists (
    select 1 from public.equipos e
    where e.id = equipo_id and (select public.es_mi_compania(e.compania_id))
  ))
  with check (exists (
    select 1 from public.equipos e
    where e.id = equipo_id and (select public.es_mi_compania(e.compania_id))
  ));

-- La disponibilidad ahora descuenta también los bloqueos.
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
    where rv.estado in ('pendiente', 'confirmada', 'en_curso')
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
