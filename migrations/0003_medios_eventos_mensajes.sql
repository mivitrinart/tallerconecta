-- 0003_medios_eventos_mensajes.sql
-- Evidencias (orden_media), línea de tiempo (order_events) y chat (messages).

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
);

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

CREATE INDEX IF NOT EXISTS idx_order_media_service_order ON order_media(service_order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_service_order ON order_events(service_order_id);
CREATE INDEX IF NOT EXISTS idx_messages_service_order ON messages(service_order_id);
