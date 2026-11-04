-- Insertar cuentas demo en base de datos limpia

-- Taller demo
INSERT OR REPLACE INTO workshops (id, nombre, ciudad, telefono, direccion, plan, estado, enlace_publico, acepta_vehiculos, cupos_disponibles, created_at, secuencia_orden) 
VALUES ('ws_demo_001', 'Taller Demo', 'Bogotá', '+573001234567', 'Calle 123 #45-67', 'pro', 'activo', 'demo_link', 1, 5, '2026-11-05T22:00:00Z', 1000);

-- Usuario propietario del taller demo
INSERT OR REPLACE INTO users (id, nombre, correo, telefono, estado, es_admin_plataforma, session_version, password_hash, created_at) 
VALUES ('usr_demo_owner', 'Juan Propietario', 'propietario@tallerdemo.co', '+573001234567', 'activo', 0, 0, 'b31a68b8e4671d6c23d1471811dce9c4.1825ed511825ed511825ed511825ed511825ed511825ed511825ed511825ed511825ed51', '2026-11-05T22:00:00Z');

-- Miembro demo del taller
INSERT OR REPLACE INTO workshop_members (id, workshop_id, user_id, rol, permisos, activo, created_at) 
VALUES ('wmem_demo_001', 'ws_demo_001', 'usr_demo_owner', 'owner', '["*"]', 1, '2026-11-05T22:00:00Z');

-- Suscripción demo
INSERT OR REPLACE INTO subscriptions (id, workshop_id, plan, estado, inicio, fin, created_at) 
VALUES ('sub_demo_001', 'ws_demo_001', 'pro', 'activa', '2026-11-05T22:00:00Z', '2026-12-05T22:00:00Z', '2026-11-05T22:00:00Z');

-- Cuenta de cliente demo
INSERT OR REPLACE INTO customer_accounts (id, nombre, correo, telefono, estado, password_hash, consentimiento_datos_at, created_at) 
VALUES ('acc_demo_cliente', 'María Cliente', 'cliente@demo.co', '+573009876543', 'activo', 'b31a68b8e4671d6c23d1471811dce9c4.1825ed511825ed511825ed511825ed511825ed511825ed511825ed511825ed511825ed51', '2026-11-05T22:00:00Z', '2026-11-05T22:00:00Z');

-- Admin de plataforma demo
INSERT OR REPLACE INTO users (id, nombre, correo, telefono, estado, es_admin_plataforma, session_version, password_hash, created_at) 
VALUES ('usr_demo_admin', 'Admin Plataforma', 'admin@tallerconecta.co', '+573000000000', 'activo', 1, 0, 'b31a68b8e4671d6c23d1471811dce9c4.1825ed511825ed511825ed511825ed511825ed511825ed511825ed511825ed511825ed51', '2026-11-05T22:00:00Z');
