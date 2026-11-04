-- ============================================================================
-- Migración D1: quitar FKs inválidas que impedían guardar aprobaciones de
-- clientes y auditoría de cuentas de cliente.
--
-- decided_by / actor_id pueden ser users.id, customers.id o
-- customer_accounts.id (el cliente aprueba desde el portal), por eso no
-- deben tener FK a users(id). SQLite no permite DROP CONSTRAINT: se
-- reconstruye cada tabla (patrón estándar de 12 pasos, seguro con datos).
--
-- Ejecutar en producción UNA vez:
--   npx wrangler d1 execute taller-conecta-db --remote --file=scripts/migrate-d1-actor-fk.sql
-- ============================================================================

PRAGMA foreign_keys = OFF;

-- authorizations
CREATE TABLE IF NOT EXISTS authorizations_new (
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
INSERT INTO authorizations_new SELECT * FROM authorizations;
DROP TABLE authorizations;
ALTER TABLE authorizations_new RENAME TO authorizations;

-- order_events
CREATE TABLE IF NOT EXISTS order_events_new (
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
);
INSERT INTO order_events_new SELECT * FROM order_events;
DROP TABLE order_events;
ALTER TABLE order_events_new RENAME TO order_events;

-- audit_logs
CREATE TABLE IF NOT EXISTS audit_logs_new (
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
INSERT INTO audit_logs_new SELECT * FROM audit_logs;
DROP TABLE audit_logs;
ALTER TABLE audit_logs_new RENAME TO audit_logs;

PRAGMA foreign_keys = ON;

-- Recrear índices que pudieron quedar asociados a los nombres antiguos
CREATE INDEX IF NOT EXISTS idx_audit_logs_workshop ON audit_logs(workshop_id);
CREATE INDEX IF NOT EXISTS idx_order_events_service_order ON order_events(service_order_id);
CREATE INDEX IF NOT EXISTS idx_authorizations_service_order ON authorizations(service_order_id);
