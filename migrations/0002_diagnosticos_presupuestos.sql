-- 0002_diagnosticos_presupuestos.sql
-- Diagnósticos, presupuestos, ítems y autorizaciones de clientes.

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
);

CREATE INDEX IF NOT EXISTS idx_diagnostics_service_order ON diagnostics(service_order_id);
CREATE INDEX IF NOT EXISTS idx_estimates_service_order ON estimates(service_order_id);
CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate ON estimate_items(estimate_id);
CREATE INDEX IF NOT EXISTS idx_authorizations_service_order ON authorizations(service_order_id);
