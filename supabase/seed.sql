-- ═══════════════════════════════════════════════════════════════════════════
-- TALLER CONECTA · Datos de demostración para Supabase/PostgreSQL
-- Ejecutar DESPUÉS de 0001_initial_schema.sql
--
-- ⚠ Todos los datos, cifras y vehículos son FICTICIOS.
-- Contraseña de todos los usuarios demo: taller123
-- Cubre los 10 estados de orden del documento.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Usuarios de autenticación (Supabase Auth) ──────────────────────────────
insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@tallerconecta.co', crypt('taller123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'carlos@motorx.co',     crypt('taller123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@motorx.co',        crypt('taller123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'luis@motorx.co',       crypt('taller123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pedro@motorx.co',      crypt('taller123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'diana@autosur.co',     crypt('taller123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.users (id, nombre, correo, telefono, es_admin_plataforma, estado) values
  ('00000000-0000-0000-0000-000000000001', 'Alejandra Botero', 'admin@tallerconecta.co', '+57 300 111 2233', true,  'activo'),
  ('00000000-0000-0000-0000-000000000002', 'Carlos Mejía',     'carlos@motorx.co',       '+57 310 456 7890', false, 'activo'),
  ('00000000-0000-0000-0000-000000000003', 'Ana Ríos',         'ana@motorx.co',          '+57 312 998 7766', false, 'activo'),
  ('00000000-0000-0000-0000-000000000004', 'Luis Pardo',       'luis@motorx.co',         '+57 318 334 5521', false, 'activo'),
  ('00000000-0000-0000-0000-000000000005', 'Pedro Salas',      'pedro@motorx.co',        '+57 320 774 1188', false, 'activo'),
  ('00000000-0000-0000-0000-000000000006', 'Diana Cruz',       'diana@autosur.co',       '+57 315 662 9090', false, 'activo')
on conflict (id) do nothing;

-- ── Talleres ────────────────────────────────────────────────────────────────
insert into public.workshops (id, nombre, nit, direccion, ciudad, telefono, plan, estado, created_at) values
  ('a0000000-0000-0000-0000-000000000001', 'Taller MotorX',    '901.234.567-8', 'Carrera 68 # 25-40', 'Bogotá', '+57 601 742 8890', 'pro',    'activo',   now() - interval '220 days'),
  ('a0000000-0000-0000-0000-000000000002', 'AutoSur Mecánica', '900.987.654-1', 'Av. 3N # 44-12',     'Cali',   '+57 602 486 1122', 'starter', 'en_prueba', now() - interval '6 days')
on conflict (id) do nothing;

insert into public.workshop_members (workshop_id, user_id, rol, permisos) values
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'owner',    array['*']),
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'advisor',  array['*']),
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'mechanic', array['orders.view_assigned','orders.update_progress','media.upload','messages.reply']),
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'mechanic', array['orders.view_assigned','orders.update_progress','media.upload','messages.reply']),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000006', 'owner',    array['*'])
on conflict (workshop_id, user_id) do nothing;

-- ── Suscripciones ───────────────────────────────────────────────────────────
insert into public.subscriptions (workshop_id, plan, estado, inicio, fin) values
  ('a0000000-0000-0000-0000-000000000001', 'pro',    'activa',    current_date - 76, current_date + 289),
  ('a0000000-0000-0000-0000-000000000002', 'starter', 'en_prueba', current_date - 6,  current_date + 8);

-- ── Clientes (tokens de portal estables para la demo) ──────────────────────
insert into public.customers (id, workshop_id, nombre, telefono, correo, documento, portal_token) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'María Gómez',    '+57 310 555 4821', 'maria.gomez@example.co',    '52.444.812',    'tok_maria_demo'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Jorge Peña',     '+57 315 222 9074', 'jorge.pena@example.co',     '79.887.201',    'tok_jorge_demo'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Laura Torres',   '+57 311 765 3322', 'laura.torres@example.co',   '1.020.334.987', 'tok_laura_demo'),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Diana Rivas',    '+57 313 208 9911', 'diana.rivas@example.co',    '52.998.120',    'tok_dianarivas_demo'),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Felipe Rojas',   '+57 316 908 4477', 'felipe.rojas@example.co',   '79.445.230',    'tok_felipe_demo'),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Hugo Ramírez',   '+57 317 665 2020', 'hugo.ramirez@example.co',   '19.222.875',    'tok_hugo_demo'),
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Valeria Ospina', '+57 314 771 9080', 'valeria.ospina@example.co', '43.992.016',    'tok_valeria_demo'),
  ('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Camila Duarte',  '+57 312 665 3390', 'camila.duarte@example.co',  '1.014.228.553', 'tok_camila_demo'),
  ('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Santiago Parra', '+57 321 447 8823', 'santiago.parra@example.co', '80.226.714',    'tok_santiago_demo'),
  ('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'Mauricio Vélez', '+57 310 887 2214', 'mauricio.velez@example.co', '98.112.003',    'tok_mauricio_demo'),
  ('c0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'Eduardo Silva',  '+57 320 993 1182', 'eduardo.silva@example.co',  '80.774.129',    'tok_eduardo_demo')
on conflict (id) do nothing;

-- ── Vehículos ───────────────────────────────────────────────────────────────
insert into public.vehicles (id, workshop_id, customer_id, placa, tipo, marca, modelo, anio, kilometraje, color) values
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'ABC-456', 'carro', 'Mazda',      '3',       2019, 62300,  'Rojo'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'BFD-87E', 'moto',  'Yamaha',     'FZ 2.0',  2021, 18450,  'Negro'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'DEF-123', 'carro', 'Nissan',     'Versa',   2020, 51880,  'Blanco'),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'JKL-321', 'carro', 'Renault',    'Duster',  2021, 45100,  'Plateado'),
  ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'MNO-654', 'carro', 'Toyota',     'Hilux',   2020, 96350,  'Blanco'),
  ('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'STU-147', 'carro', 'Volkswagen', 'Golf',    2017, 88240,  'Azul'),
  ('d0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000007', 'YBC-556', 'carro', 'Renault',    'Sandero', 2019, 58700,  'Gris'),
  ('d0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000008', 'EFG-234', 'carro', 'Suzuki',     'Swift',   2021, 38120,  'Blanco'),
  ('d0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000009', 'HIJ-567', 'carro', 'Renault',    'Logan',   2020, 61230,  'Café'),
  ('d0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000010', 'KLM-890', 'carro', 'Nissan',     'Frontier',2019, 104500, 'Verde'),
  ('d0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000011', 'WXD-88F', 'carro', 'Ford',       'Ranger',  2023, 31450,  'Negro')
on conflict (id) do nothing;

-- ── Órdenes de servicio (los 10 estados) ───────────────────────────────────
-- ids: e0000000-0000-0000-0000-0000NNNN donde NNNN = número de orden
insert into public.service_orders
  (id, workshop_id, customer_id, vehicle_id, numero, estado, motivo_ingreso, sintomas,
   fecha_ingreso, fecha_estimada_entrega, fecha_entrega, responsable_id, creado_por,
   notas_internas, valor_final, calificacion, calificacion_comentario)
values
  ('e0000000-0000-0000-0000-0000001030', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000006', 'ORD-1030', 'cancelado',            'Cambio de amortiguadores',        'Golpe seco al pasar baches',            now() - interval '30 days', null,                        null,                        null,                        '00000000-0000-0000-0000-000000000003', 'Cancelada: la clienta decidió no proceder.', null, null, null),
  ('e0000000-0000-0000-0000-0000001032', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000006', 'ORD-1032', 'entregado',            'Mantenimiento 80.000 km',         'Vibración leve al frenar',              now() - interval '26 days', null,                        now() - interval '24 days',  '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', null, 1785000, 5, 'Excelente atención, me mantuvieron informado con fotos.'),
  ('e0000000-0000-0000-0000-0000001036', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'ORD-1036', 'entregado',            'Cambio de aceite y revisión',     null,                                    now() - interval '12 days', null,                        now() - interval '12 days',  '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', null, 297500, 5, 'Rápido y transparente.'),
  ('e0000000-0000-0000-0000-0000001038', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000007', 'ORD-1038', 'listo_entrega',        'Cambio de amortiguadores traseros', null,                                  now() - interval '6 days',  now(),                       null,                        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', null, null, null, null),
  ('e0000000-0000-0000-0000-0000001040', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000008', 'ORD-1040', 'en_pruebas',           'Revisión de frenos',              'Chirrido al frenar',                    now() - interval '4 days',  now() + interval '1 day',    null,                        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', null, null, null, null),
  ('e0000000-0000-0000-0000-0000001041', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000009', 'ORD-1041', 'autorizado',           'Falla eléctrica y batería',       'No enciende en las mañanas',            now() - interval '3 days',  now() + interval '2 days',   null,                        '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', null, null, null, null),
  ('e0000000-0000-0000-0000-0000001042', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000005', 'ORD-1042', 'en_reparacion',        'Ruido en suspensión delantera',   'Golpe seco al pasar baches',            now() - interval '3 days',  now() - interval '1 day',    null,                        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'Cliente solicita aviso por WhatsApp antes de entregar.', null, null, null),
  ('e0000000-0000-0000-0000-0000001043', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000010', 'ORD-1043', 'en_espera',            'Falla de inyección diésel',       'Humo negro y pérdida de potencia',      now() - interval '4 days',  now() + interval '3 days',   null,                        '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', 'En espera de bomba de inyección (llega el jueves).', null, null, null),
  ('e0000000-0000-0000-0000-0000001044', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', 'ORD-1044', 'esperando_aprobacion', 'Cambio de correa de repartición', 'Kilometraje llegó a 45.000 km',         now() - interval '4 days',  now() + interval '2 days',   null,                        null,                        '00000000-0000-0000-0000-000000000003', 'Presupuesto enviado hace 3 días, cliente sin respuesta.', null, null, null),
  ('e0000000-0000-0000-0000-0000001046', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'ORD-1046', 'en_reparacion',        'Cambio de frenos delanteros',     'Pedal esponjoso y ruido metálico',      now() - interval '2 days',  now() + interval '1 day',    null,                        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', null, null, null, null),
  ('e0000000-0000-0000-0000-0000001048', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'ORD-1048', 'esperando_aprobacion', 'Ruidos en suspensión delantera',  'Golpe al pasar policías acostados',     now() - interval '1 day',   now() + interval '3 days',   null,                        null,                        '00000000-0000-0000-0000-000000000003', 'Cliente muy pendiente. Prefiere WhatsApp.', null, null, null),
  ('e0000000-0000-0000-0000-0000001049', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'ORD-1049', 'en_diagnostico',       'Falla eléctrica, no enciende',    'Se apagó en marcha',                    now() - interval '1 day',   now() + interval '2 days',   null,                        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', null, null, null, null),
  ('e0000000-0000-0000-0000-0000001052', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000011', 'ORD-1052', 'recibido',             'Revisión de garantía: luz de motor', 'Testigo check engine desde ayer',     now() - interval '2 hours', now() + interval '1 day',    null,                        null,                        '00000000-0000-0000-0000-000000000003', 'Rayón en puerta trasera izquierda registrado en acta.', null, null, null)
on conflict (id) do nothing;

-- ── Diagnósticos ────────────────────────────────────────────────────────────
insert into public.diagnostics (service_order_id, workshop_id, descripcion, recomendaciones, creado_por, created_at) values
  ('e0000000-0000-0000-0000-0000001048', 'a0000000-0000-0000-0000-000000000001',
   'Prueba de ruta y revisión en elevador: desgaste en los 4 amortiguadores (fuga en el delantero derecho), bujes de tijera con juego y bieletas desgastadas. La cremallera de dirección está en buen estado (se descartó la fuga sospechada inicialmente).',
   'Reemplazar juego de amortiguadores, bujes de tijera y bieletas. Alineación y balanceo computerizada al terminar. No requiere intervención de la cremallera.',
   '00000000-0000-0000-0000-000000000003', now() - interval '1 day');

-- ── Presupuestos e ítems ────────────────────────────────────────────────────
-- ORD-1048: v1 SUPERADA (incluía cremallera) → v2 ENVIADA (ajustada tras consulta)
insert into public.estimates (id, service_order_id, workshop_id, version, subtotal, descuento, impuesto_porcentaje, impuestos, total, estado, creado_por, created_at, enviada_at) values
  ('f0000000-0000-0000-0000-000000104811', 'e0000000-0000-0000-0000-0000001048', 'a0000000-0000-0000-0000-000000000001', 1, 2680000, 0, 19, 509200, 3189200, 'superada', '00000000-0000-0000-0000-000000000003', now() - interval '1 day', now() - interval '1 day'),
  ('f0000000-0000-0000-0000-000000104821', 'e0000000-0000-0000-0000-0000001048', 'a0000000-0000-0000-0000-000000000001', 2, 2000000, 50000, 19, 370500, 2370500, 'enviada',  '00000000-0000-0000-0000-000000000003', now() - interval '3 hours', now() - interval '2 hours')
on conflict (id) do nothing;

insert into public.estimate_items (estimate_id, workshop_id, tipo, descripcion, cantidad, precio_unitario, estado) values
  ('f0000000-0000-0000-0000-000000104811', 'a0000000-0000-0000-0000-000000000001', 'repuesto',  'Juego de amortiguadores (4)', 4, 320000, 'rechazada'),
  ('f0000000-0000-0000-0000-000000104811', 'a0000000-0000-0000-0000-000000000001', 'repuesto',  'Cremallera de dirección',     1, 1800000, 'rechazada'),
  ('f0000000-0000-0000-0000-000000104811', 'a0000000-0000-0000-0000-000000000001', 'mano_obra', 'Mano de obra suspensión',     1, 450000, 'rechazada'),
  ('f0000000-0000-0000-0000-000000104821', 'a0000000-0000-0000-0000-000000000001', 'repuesto',  'Juego de amortiguadores delanteros y traseros (4)', 4, 320000, 'pendiente'),
  ('f0000000-0000-0000-0000-000000104821', 'a0000000-0000-0000-0000-000000000001', 'repuesto',  'Bujes de tijera delanteros',  2, 85000,  'pendiente'),
  ('f0000000-0000-0000-0000-000000104821', 'a0000000-0000-0000-0000-000000000001', 'repuesto',  'Bieletas delanteras (par)',   1, 120000, 'pendiente'),
  ('f0000000-0000-0000-0000-000000104821', 'a0000000-0000-0000-0000-000000000001', 'mano_obra', 'Mano de obra suspensión completa', 1, 450000, 'pendiente'),
  ('f0000000-0000-0000-0000-000000104821', 'a0000000-0000-0000-0000-000000000001', 'servicio',  'Alineación y balanceo computerizada', 1, 90000, 'pendiente');

-- Presupuestos aprobados de órdenes en curso / entregadas
insert into public.estimates (id, service_order_id, workshop_id, version, subtotal, descuento, impuesto_porcentaje, impuestos, total, estado, creado_por, created_at, enviada_at, decidida_at) values
  ('f0000000-0000-0000-0000-000000103211', 'e0000000-0000-0000-0000-0000001032', 'a0000000-0000-0000-0000-000000000001', 1, 1150000, 0, 19, 218500, 1368500, 'aprobada', '00000000-0000-0000-0000-000000000003', now() - interval '26 days', now() - interval '26 days', now() - interval '25 days'),
  ('f0000000-0000-0000-0000-000000103811', 'e0000000-0000-0000-0000-0000001038', 'a0000000-0000-0000-0000-000000000001', 1, 780000, 0, 19, 148200, 928200, 'aprobada', '00000000-0000-0000-0000-000000000003', now() - interval '6 days', now() - interval '6 days', now() - interval '5 days'),
  ('f0000000-0000-0000-0000-000000104111', 'e0000000-0000-0000-0000-0000001041', 'a0000000-0000-0000-0000-000000000001', 1, 550000, 0, 19, 104500, 654500, 'aprobada', '00000000-0000-0000-0000-000000000003', now() - interval '3 days', now() - interval '3 days', now() - interval '1 day'),
  ('f0000000-0000-0000-0000-000000104211', 'e0000000-0000-0000-0000-0000001042', 'a0000000-0000-0000-0000-000000000001', 1, 680000, 0, 19, 129200, 809200, 'aprobada', '00000000-0000-0000-0000-000000000003', now() - interval '3 days', now() - interval '3 days', now() - interval '2 days'),
  ('f0000000-0000-0000-0000-000000104311', 'e0000000-0000-0000-0000-0000001043', 'a0000000-0000-0000-0000-000000000001', 1, 2150000, 0, 19, 408500, 2558500, 'parcialmente_aprobada', '00000000-0000-0000-0000-000000000003', now() - interval '4 days', now() - interval '4 days', now() - interval '3 days'),
  ('f0000000-0000-0000-0000-000000104411', 'e0000000-0000-0000-0000-0000001044', 'a0000000-0000-0000-0000-000000000001', 1, 1185000, 0, 19, 225150, 1410150, 'enviada', '00000000-0000-0000-0000-000000000003', now() - interval '3 days', now() - interval '3 days', null),
  ('f0000000-0000-0000-0000-000000104611', 'e0000000-0000-0000-0000-0000001046', 'a0000000-0000-0000-0000-000000000001', 1, 905000, 0, 19, 171950, 1076950, 'aprobada', '00000000-0000-0000-0000-000000000003', now() - interval '2 days', now() - interval '2 days', now() - interval '2 days')
on conflict (id) do nothing;

insert into public.estimate_items (estimate_id, workshop_id, tipo, descripcion, cantidad, precio_unitario, estado) values
  ('f0000000-0000-0000-0000-000000104411', 'a0000000-0000-0000-0000-000000000001', 'repuesto',  'Kit de repartición (correa, tensores y polea)', 1, 480000, 'pendiente'),
  ('f0000000-0000-0000-0000-000000104411', 'a0000000-0000-0000-0000-000000000001', 'repuesto',  'Bomba de agua', 1, 260000, 'pendiente'),
  ('f0000000-0000-0000-0000-000000104411', 'a0000000-0000-0000-0000-000000000001', 'mano_obra', 'Mano de obra cambio de repartición', 1, 380000, 'pendiente'),
  ('f0000000-0000-0000-0000-000000104411', 'a0000000-0000-0000-0000-000000000001', 'repuesto',  'Refrigerante orgánico (galón)', 1, 65000, 'pendiente'),
  ('f0000000-0000-0000-0000-000000104311', 'a0000000-0000-0000-0000-000000000001', 'repuesto',  'Bomba de inyección remanufacturada', 1, 1450000, 'aprobada'),
  ('f0000000-0000-0000-0000-000000104311', 'a0000000-0000-0000-0000-000000000001', 'mano_obra', 'Mano de obra sistema de inyección', 1, 520000, 'aprobada'),
  ('f0000000-0000-0000-0000-000000104311', 'a0000000-0000-0000-0000-000000000001', 'servicio',  'Escaneo y calibración especializada', 1, 180000, 'rechazada');

-- Autorizaciones (evidencia de decisiones con versión y fecha)
insert into public.authorizations (estimate_id, service_order_id, workshop_id, version_aceptada, decision, decided_by, decided_by_nombre, monto_aprobado, created_at) values
  ('f0000000-0000-0000-0000-000000103211', 'e0000000-0000-0000-0000-0000001032', 'a0000000-0000-0000-0000-000000000001', 1, 'aprobada_total',  'c0000000-0000-0000-0000-000000000006', 'Hugo Ramírez',   1368500, now() - interval '25 days'),
  ('f0000000-0000-0000-0000-000000104111', 'e0000000-0000-0000-0000-0000001041', 'a0000000-0000-0000-0000-000000000001', 1, 'aprobada_total',  'c0000000-0000-0000-0000-000000000009', 'Santiago Parra', 654500,  now() - interval '1 day'),
  ('f0000000-0000-0000-0000-000000104311', 'e0000000-0000-0000-0000-0000001043', 'a0000000-0000-0000-0000-000000000001', 1, 'aprobada_parcial','c0000000-0000-0000-0000-000000000010', 'Mauricio Vélez', 2344100, now() - interval '3 days');

-- ── Eventos, mensajes y notificaciones ──────────────────────────────────────
insert into public.order_events (service_order_id, workshop_id, tipo, estado_anterior, estado_nuevo, descripcion, actor_id, actor_nombre, created_at) values
  ('e0000000-0000-0000-0000-0000001048', 'a0000000-0000-0000-0000-000000000001', 'creacion', null, 'recibido', 'Orden ORD-1048 creada · Recepción del vehículo', '00000000-0000-0000-0000-000000000003', 'Ana Ríos', now() - interval '1 day'),
  ('e0000000-0000-0000-0000-0000001048', 'a0000000-0000-0000-0000-000000000001', 'diagnostico', null, null, 'Diagnóstico registrado por Ana Ríos', '00000000-0000-0000-0000-000000000003', 'Ana Ríos', now() - interval '20 hours'),
  ('e0000000-0000-0000-0000-0000001048', 'a0000000-0000-0000-0000-000000000001', 'presupuesto', null, null, 'Presupuesto v1 enviado al cliente', '00000000-0000-0000-0000-000000000003', 'Ana Ríos', now() - interval '18 hours'),
  ('e0000000-0000-0000-0000-0000001048', 'a0000000-0000-0000-0000-000000000001', 'presupuesto', null, null, 'Presupuesto v2 enviado al cliente (ajustado tras su consulta)', '00000000-0000-0000-0000-000000000003', 'Ana Ríos', now() - interval '2 hours'),
  ('e0000000-0000-0000-0000-0000001030', 'a0000000-0000-0000-0000-000000000001', 'cambio_estado', 'esperando_aprobacion', 'cancelado', 'Orden cancelada · Motivo: la clienta retiró el vehículo sin autorizar la reparación', '00000000-0000-0000-0000-000000000002', 'Carlos Mejía', now() - interval '29 days'),
  ('e0000000-0000-0000-0000-0000001032', 'a0000000-0000-0000-0000-000000000001', 'entrega', 'listo_entrega', 'entregado', 'Vehículo entregado · Valor final $1.785.000', '00000000-0000-0000-0000-000000000003', 'Ana Ríos', now() - interval '24 days');

insert into public.messages (service_order_id, workshop_id, remitente_tipo, remitente_id, remitente_nombre, contenido, leido, created_at) values
  ('e0000000-0000-0000-0000-0000001048', 'a0000000-0000-0000-0000-000000000001', 'customer', 'c0000000-0000-0000-0000-000000000001', 'María Gómez', 'Hola, vi el presupuesto. ¿La cremallera es necesaria? En otra revisión me dijeron que estaba bien.', true,  now() - interval '16 hours'),
  ('e0000000-0000-0000-0000-0000001048', 'a0000000-0000-0000-0000-000000000001', 'staff',    '00000000-0000-0000-0000-000000000003', 'Ana Ríos',    '¡Hola María! Revisamos de nuevo la cremallera y confirmamos que está en buen estado. Actualizamos el presupuesto quitando ese ítem (v2).', true, now() - interval '15 hours'),
  ('e0000000-0000-0000-0000-0000001048', 'a0000000-0000-0000-0000-000000000001', 'customer', 'c0000000-0000-0000-0000-000000000001', 'María Gómez', 'Gracias por la transparencia. ¿Me confirman si el arreglo queda listo este viernes? Necesito el carro para viajar el sábado.', false, now() - interval '1 hour'),
  ('e0000000-0000-0000-0000-0000001044', 'a0000000-0000-0000-0000-000000000001', 'customer', 'c0000000-0000-0000-0000-000000000004', 'Diana Rivas', 'Hola, ¿es necesario cambiar también la bomba de agua o puede esperar?', false, now() - interval '2 days');

insert into public.notifications (workshop_id, destinatario_tipo, destinatario_id, tipo, titulo, cuerpo, canal, estado, service_order_id, created_at) values
  ('a0000000-0000-0000-0000-000000000001', 'customer', 'c0000000-0000-0000-0000-000000000001', 'presupuesto_pendiente', 'Presupuesto pendiente de aprobación', 'El presupuesto v2 del Mazda 3 (ABC-456) está listo para tu revisión: $2.370.500.', 'in_app', 'pendiente', 'e0000000-0000-0000-0000-0000001048', now() - interval '2 hours'),
  ('a0000000-0000-0000-0000-000000000001', 'customer', 'c0000000-0000-0000-0000-000000000001', 'presupuesto_pendiente', 'Presupuesto pendiente de aprobación', 'El presupuesto v2 del Mazda 3 (ABC-456) está listo para tu revisión: $2.370.500.', 'email',  'enviada',   'e0000000-0000-0000-0000-0000001048', now() - interval '2 hours'),
  ('a0000000-0000-0000-0000-000000000001', 'user',     '00000000-0000-0000-0000-000000000003', 'respuesta_pendiente',   'Respuesta pendiente · ORD-1048', 'María Gómez preguntó si su Mazda 3 estará listo el viernes.', 'in_app', 'pendiente', 'e0000000-0000-0000-0000-0000001048', now() - interval '1 hour'),
  ('a0000000-0000-0000-0000-000000000001', 'user',     '00000000-0000-0000-0000-000000000002', 'alerta_sin_respuesta',  'Cliente sin respuesta · ORD-1044', 'Diana Rivas no ha respondido al presupuesto enviado hace 3 días.', 'in_app', 'pendiente', 'e0000000-0000-0000-0000-0000001044', now() - interval '8 hours'),
  ('a0000000-0000-0000-0000-000000000001', 'user',     '00000000-0000-0000-0000-000000000002', 'alerta_retraso',      'Trabajo retrasado · ORD-1042', 'La orden ORD-1042 (Toyota Hilux) superó la fecha estimada de entrega.', 'in_app', 'pendiente', 'e0000000-0000-0000-0000-0000001042', now() - interval '1 day'),
  ('a0000000-0000-0000-0000-000000000001', 'customer', 'c0000000-0000-0000-0000-000000000007', 'vehiculo_listo',      '¡Tu vehículo está listo!', 'El Renault Sandero (YBC-556) está listo para recoger.', 'in_app', 'pendiente', 'e0000000-0000-0000-0000-0000001038', now() - interval '1 day');

-- ── Auditoría inicial ───────────────────────────────────────────────────────
insert into public.audit_logs (workshop_id, actor_id, actor_nombre, accion, entidad, entidad_id, detalle) values
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Ana Ríos',       'presupuesto.enviar',   'estimates',      'f0000000-0000-0000-0000-000000104821', '{"version":2,"total":2370500}'),
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Carlos Mejía',   'orden.cancelar',       'service_orders', 'e0000000-0000-0000-0000-0000001030',   '{"motivo":"Cliente retiró el vehículo"}'),
  (null,                                   '00000000-0000-0000-0000-000000000001', 'Alejandra Botero','taller.registrar',    'workshops',      'a0000000-0000-0000-0000-000000000002', '{"plan":"starter","estado":"en_prueba"}');

-- ── Cuenta de cliente demo (migración 0002) ────────────────────────────────
-- María Gómez creó su cuenta y vinculó su ficha con el enlace personal del taller
-- (la vinculación es SOLO por enlace; no hay auto-vinculación por correo).
-- Acceso: maria.gomez@example.co / cliente123
insert into public.customer_accounts (id, nombre, correo, telefono, estado) values
  ('b0000000-0000-0000-0000-000000000001', 'María Gómez', 'maria.gomez@example.co', '+57 310 555 4821', 'activo')
on conflict (id) do nothing;

insert into public.customer_account_links (account_id, customer_id, workshop_id, origen) values
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'token')
on conflict (customer_id) do nothing;

-- Cuenta de cliente demo: María registró además su segundo vehículo desde /cuenta
insert into public.vehicles (id, workshop_id, customer_id, placa, tipo, marca, modelo, anio, kilometraje, color, origen, registrado_por_account_id) values
  ('d0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'HQR-210', 'carro', 'Renault', 'Twingo', 2017, 98400, 'Verde', 'cliente', 'b0000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- Consentimiento registrado por el taller en las fichas demo
update public.customers
   set consentimiento_datos_at = created_at,
       consentimiento_origen = 'taller'
 where consentimiento_datos_at is null;

-- ═══════════════════════════════════════════════════════════════════════════
-- Verificación rápida:
--   select estado, count(*) from public.service_orders group by estado;
-- Portales de demo (enlaces personales):
--   María Gómez  → /seguimiento/tok_maria_demo
--   Diana Rivas  → /seguimiento/tok_dianarivas_demo
-- ═══════════════════════════════════════════════════════════════════════════
