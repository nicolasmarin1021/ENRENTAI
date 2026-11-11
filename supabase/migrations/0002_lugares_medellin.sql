-- ============================================================================
-- ENRENTA · Lugares de show en Medellín (públicos, para el pedido guiado)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo → Run. Una sola vez.
--
-- Las coordenadas son aproximadas (a la entrada principal). Si alguna queda
-- corrida en el mapa, se corrige con:
--   update public.lugares set lat = ..., lng = ... where nombre = '...';
-- Los clientes también pueden agregar su propio lugar con dirección y pin.
-- ============================================================================

insert into public.lugares (nombre, direccion, ciudad, lat, lng, publico) values
  ('Estadio Atanasio Girardot',            'Cra. 74 # 48-10, Laureles – Estadio',   'Medellín', 6.2567, -75.5900, true),
  ('Coliseo Iván de Bedout',               'Unidad Deportiva Atanasio Girardot',    'Medellín', 6.2560, -75.5873, true),
  ('Plaza Mayor Medellín',                 'Calle 41 # 55-80, La Alpujarra',        'Medellín', 6.2416, -75.5753, true),
  ('Teatro Metropolitano',                 'Calle 41 # 57-30, La Alpujarra',        'Medellín', 6.2405, -75.5776, true),
  ('Teatro Pablo Tobón Uribe',             'Cra. 40 # 51-24, Boston',               'Medellín', 6.2475, -75.5590, true),
  ('Teatro Lido',                          'Cra. 48 # 54-20, Parque Bolívar',       'Medellín', 6.2531, -75.5655, true),
  ('Centro de Espectáculos La Macarena',   'Av. San Juan con Cra. 63', 'Medellín', 6.2460, -75.5810, true),
  ('Parque Norte',                         'Cra. 53 # 76-115',                      'Medellín', 6.2731, -75.5672, true),
  ('Jardín Botánico (Orquideorama)',       'Calle 73 # 51D-14',                     'Medellín', 6.2707, -75.5640, true),
  ('Parque de los Pies Descalzos',         'Cra. 57 # 42-139, La Alpujarra',        'Medellín', 6.2443, -75.5788, true),
  ('Teatro Universidad de Medellín',       'Cra. 87 # 30-65, Belén Los Alpes',      'Medellín', 6.2316, -75.6105, true);
