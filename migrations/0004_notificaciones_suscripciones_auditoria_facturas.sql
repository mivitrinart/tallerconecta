-- 0004_notificaciones_suscripciones_auditoria_facturas.sql
-- Notificaciones, suscripciones SaaS, auditoría inmutable y facturas.

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
);

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

CREATE INDEX IF NOT EXISTS idx_notifications_destinatario ON notifications(destinatario_tipo, destinatario_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_workshop ON subscriptions(workshop_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workshop ON audit_logs(workshop_id);
CREATE INDEX IF NOT EXISTS idx_invoices_service_order ON invoices(service_order_id);
