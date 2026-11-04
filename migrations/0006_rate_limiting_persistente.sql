-- 0006_rate_limiting_persistente.sql
-- Rate limiting persistente en D1 (compartido entre réplicas del Worker).
-- Usado por lib/auth/rate-limit-d1.ts para login, registro y rutas sensibles.

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clave TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rle_clave_tiempo ON rate_limit_events (clave, created_at);
