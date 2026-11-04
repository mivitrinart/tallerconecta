-- 0001_initial_schema.sql
-- Tablas base: talleres, usuarios, miembros, clientes, cuentas de cliente,
-- vínculos, vehículos y órdenes de servicio.

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

CREATE INDEX IF NOT EXISTS idx_workshops_enlace_publico ON workshops(enlace_publico);
CREATE INDEX IF NOT EXISTS idx_users_correo ON users(correo);
CREATE INDEX IF NOT EXISTS idx_workshop_members_workshop ON workshop_members(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_members_user ON workshop_members(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_workshop ON customers(workshop_id);
CREATE INDEX IF NOT EXISTS idx_customers_portal_token ON customers(portal_token);
CREATE INDEX IF NOT EXISTS idx_customer_account_links_workshop ON customer_account_links(workshop_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_workshop ON vehicles(workshop_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_workshop ON service_orders(workshop_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_customer ON service_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_estado ON service_orders(estado);
