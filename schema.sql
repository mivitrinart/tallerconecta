-- Esquema D1 para Taller Conecta
-- Todas las tablas basadas en lib/database/types.ts

-- workshops
CREATE TABLE IF NOT EXISTS workshops (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  nit TEXT,
  direccion TEXT NOT NULL,
  telefono TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  logo_url TEXT,
  google_maps_url TEXT,
  plan TEXT NOT NULL DEFAULT 'starter',
  estado TEXT NOT NULL DEFAULT 'activo',
  enlace_publico TEXT UNIQUE,
  acepta_vehiculos INTEGER DEFAULT 1,
  cupos_disponibles INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  secuencia_orden INTEGER DEFAULT 1000
);

-- users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL,
  telefono TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo',
  avatar_url TEXT,
  es_admin_plataforma INTEGER DEFAULT 0,
  session_version INTEGER DEFAULT 0,
  password_hash TEXT,
  email_verified INTEGER DEFAULT 0,
  email_verified_at TEXT,
  created_at TEXT NOT NULL
);

-- workshop_members
CREATE TABLE IF NOT EXISTS workshop_members (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rol TEXT NOT NULL,
  permisos TEXT NOT NULL DEFAULT '[]',
  activo INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  correo TEXT NOT NULL,
  documento TEXT,
  portal_token TEXT UNIQUE NOT NULL,
  consentimiento_datos_at TEXT,
  consentimiento_origen TEXT,
  anonimizado INTEGER DEFAULT 0,
  portal_activo INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id)
);

-- customer_accounts
CREATE TABLE IF NOT EXISTS customer_accounts (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL,
  telefono TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo',
  password_hash TEXT,
  consentimiento_datos_at TEXT NOT NULL,
  email_verified INTEGER DEFAULT 0,
  email_verified_at TEXT,
  created_at TEXT NOT NULL
);

-- customer_account_links
CREATE TABLE IF NOT EXISTS customer_account_links (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  workshop_id TEXT NOT NULL,
  origen TEXT NOT NULL DEFAULT 'public',
  estado TEXT NOT NULL DEFAULT 'pendiente',
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES customer_accounts(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (workshop_id) REFERENCES workshops(id)
);

-- vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  placa TEXT NOT NULL,
  tipo TEXT NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  anio INTEGER NOT NULL,
  kilometraje INTEGER NOT NULL DEFAULT 0,
  color TEXT,
  origen TEXT NOT NULL DEFAULT 'taller',
  registrado_por_account_id TEXT,
  ultimo_recordatorio_mant_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (registrado_por_account_id) REFERENCES customer_accounts(id)
);

-- service_orders
CREATE TABLE IF NOT EXISTS service_orders (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  vehicle_id TEXT NOT NULL,
  numero TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'recibido',
  motivo_ingreso TEXT NOT NULL,
  sintomas TEXT,
  fecha_ingreso TEXT NOT NULL,
  fecha_estimada_entrega TEXT,
  fecha_entrega TEXT,
  responsable_id TEXT,
  creado_por TEXT NOT NULL,
  notas_internas TEXT,
  valor_final INTEGER,
  calificacion INTEGER,
  calificacion_comentario TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  FOREIGN KEY (responsable_id) REFERENCES users(id),
  FOREIGN KEY (creado_por) REFERENCES users(id)
);

-- diagnostics
CREATE TABLE IF NOT EXISTS diagnostics (
  id TEXT PRIMARY KEY,
  service_order_id TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  recomendaciones TEXT NOT NULL,
  creado_por TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (service_order_id) REFERENCES service_orders(id),
  FOREIGN KEY (creado_por) REFERENCES users(id)
);

-- estimates
CREATE TABLE IF NOT EXISTS estimates (
  id TEXT PRIMARY KEY,
  service_order_id TEXT NOT NULL,
  workshop_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  subtotal INTEGER NOT NULL DEFAULT 0,
  descuento INTEGER NOT NULL DEFAULT 0,
  impuesto_porcentaje INTEGER NOT NULL DEFAULT 19,
  impuestos INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'borrador',
  validez_dias INTEGER NOT NULL DEFAULT 15,
  creado_por TEXT NOT NULL,
  created_at TEXT NOT NULL,
  enviada_at TEXT,
  decidida_at TEXT,
  FOREIGN KEY (service_order_id) REFERENCES service_orders(id),
  FOREIGN KEY (workshop_id) REFERENCES workshops(id),
  FOREIGN KEY (creado_por) REFERENCES users(id)
);

-- estimate_items
CREATE TABLE IF NOT EXISTS estimate_items (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario INTEGER NOT NULL DEFAULT 0,
  subtotal INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  requiere_autorizacion INTEGER DEFAULT 1,
  criticidad TEXT,
  alternativa_descripcion TEXT,
  alternativa_precio_unitario INTEGER,
  taller_recomienda TEXT,
  FOREIGN KEY (estimate_id) REFERENCES estimates(id)
);

-- authorizations
CREATE TABLE IF NOT EXISTS authorizations (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL,
  service_order_id TEXT NOT NULL,
  workshop_id TEXT NOT NULL,
  version_aceptada INTEGER NOT NULL,
  decision TEXT NOT NULL,
  estado TEXT DEFAULT 'emitida',
  decided_by TEXT NOT NULL,
  decided_by_nombre TEXT NOT NULL,
  monto_aprobado INTEGER NOT NULL DEFAULT 0,
  items_aprobados TEXT NOT NULL DEFAULT '[]',
  items_rechazados TEXT NOT NULL DEFAULT '[]',
  items_postergados TEXT DEFAULT '[]',
  items_con_alternativa TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  FOREIGN KEY (estimate_id) REFERENCES estimates(id),
  FOREIGN KEY (service_order_id) REFERENCES service_orders(id),
  FOREIGN KEY (workshop_id) REFERENCES workshops(id)
  -- decided_by SIN FK a users: puede ser un usuario del taller O un cliente
  -- (customer_accounts.id / customers.id) cuando aprueba desde el portal.
);

-- order_media
CREATE TABLE IF NOT EXISTS order_media (
  id TEXT PRIMARY KEY,
  service_order_id TEXT NOT NULL,
  workshop_id TEXT NOT NULL,
  categoria TEXT NOT NULL,
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  autor_id TEXT,
  autor_nombre TEXT NOT NULL,
  visible_cliente INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (service_order_id) REFERENCES service_orders(id),
  FOREIGN KEY (workshop_id) REFERENCES workshops(id),
  FOREIGN KEY (autor_id) REFERENCES users(id)
);

-- order_events
CREATE TABLE IF NOT EXISTS order_events (
  id TEXT PRIMARY KEY,
  service_order_id TEXT NOT NULL,
  workshop_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  estado_anterior TEXT,
  estado_nuevo TEXT,
  descripcion TEXT NOT NULL,
  actor_id TEXT,
  actor_nombre TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (service_order_id) REFERENCES service_orders(id),
  FOREIGN KEY (workshop_id) REFERENCES workshops(id)
  -- actor_id SIN FK a users: también puede ser un cliente (customer_accounts.id).
);

-- messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  service_order_id TEXT NOT NULL,
  workshop_id TEXT NOT NULL,
  remitente_tipo TEXT NOT NULL,
  remitente_id TEXT,
  remitente_nombre TEXT NOT NULL,
  contenido TEXT NOT NULL,
  leido INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (service_order_id) REFERENCES service_orders(id),
  FOREIGN KEY (workshop_id) REFERENCES workshops(id)
);

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  workshop_id TEXT,
  destinatario_tipo TEXT NOT NULL,
  destinatario_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  cuerpo TEXT NOT NULL,
  canal TEXT NOT NULL DEFAULT 'in_app',
  estado TEXT NOT NULL DEFAULT 'pendiente',
  link TEXT,
  service_order_id TEXT,
  created_at TEXT NOT NULL,
  leida_at TEXT,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id),
  FOREIGN KEY (service_order_id) REFERENCES service_orders(id)
);

-- subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter',
  estado TEXT NOT NULL DEFAULT 'en_prueba',
  inicio TEXT NOT NULL,
  fin TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id)
);

-- audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  workshop_id TEXT,
  actor_id TEXT,
  actor_nombre TEXT NOT NULL,
  accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id TEXT,
  detalle TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id)
  -- actor_id SIN FK a users: también puede ser una cuenta de cliente (acc_*).
);

-- invoices
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  service_order_id TEXT NOT NULL,
  estimate_id TEXT NOT NULL,
  workshop_id TEXT NOT NULL,
  numero TEXT NOT NULL UNIQUE,
  fecha_emision TEXT NOT NULL,
  nit_emisor TEXT NOT NULL,
  nombre_emisor TEXT NOT NULL,
  documento_cliente TEXT NOT NULL,
  nombre_cliente TEXT NOT NULL,
  direccion_cliente TEXT,
  medio_pago TEXT NOT NULL,
  subtotal INTEGER NOT NULL DEFAULT 0,
  descuento INTEGER NOT NULL DEFAULT 0,
  impuesto_porcentaje INTEGER NOT NULL DEFAULT 19,
  impuestos INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  cufe TEXT NOT NULL,
  xml TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'borrador',
  creado_por TEXT NOT NULL,
  created_at TEXT NOT NULL,
  anulada_at TEXT,
  pagada_at TEXT,
  FOREIGN KEY (service_order_id) REFERENCES service_orders(id),
  FOREIGN KEY (estimate_id) REFERENCES estimates(id),
  FOREIGN KEY (workshop_id) REFERENCES workshops(id),
  FOREIGN KEY (creado_por) REFERENCES users(id)
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_workshops_enlace_publico ON workshops(enlace_publico);
CREATE INDEX IF NOT EXISTS idx_workshop_members_workshop ON workshop_members(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_members_user ON workshop_members(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_workshop ON customers(workshop_id);
CREATE INDEX IF NOT EXISTS idx_customers_portal_token ON customers(portal_token);
CREATE INDEX IF NOT EXISTS idx_vehicles_workshop ON vehicles(workshop_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_workshop ON service_orders(workshop_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_customer ON service_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_estado ON service_orders(estado);
CREATE INDEX IF NOT EXISTS idx_diagnostics_service_order ON diagnostics(service_order_id);
CREATE INDEX IF NOT EXISTS idx_estimates_service_order ON estimates(service_order_id);
CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate ON estimate_items(estimate_id);
CREATE INDEX IF NOT EXISTS idx_authorizations_service_order ON authorizations(service_order_id);
CREATE INDEX IF NOT EXISTS idx_order_media_service_order ON order_media(service_order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_service_order ON order_events(service_order_id);
CREATE INDEX IF NOT EXISTS idx_messages_service_order ON messages(service_order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_destinatario ON notifications(destinatario_tipo, destinatario_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_workshop ON subscriptions(workshop_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workshop ON audit_logs(workshop_id);
CREATE INDEX IF NOT EXISTS idx_invoices_service_order ON invoices(service_order_id);

-- email_verification_codes: códigos de verificación por correo
CREATE TABLE IF NOT EXISTS email_verification_codes (
  id TEXT PRIMARY KEY,
  correo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'register',
  estado TEXT NOT NULL DEFAULT 'pendiente',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  attempts INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_email_verification_codes_correo ON email_verification_codes(correo);
CREATE INDEX IF NOT EXISTS idx_email_verification_codes_code ON email_verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_email_verification_codes_estado ON email_verification_codes(estado);

-- ── Seguridad: rate limiting persistente (usado por lib/auth/rate-limit-d1.ts) ──
CREATE TABLE IF NOT EXISTS rate_limit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clave TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rle_clave_tiempo ON rate_limit_events (clave, created_at);
