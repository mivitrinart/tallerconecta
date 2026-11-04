-- 0005_codigo_verificacion_email.sql
-- Códigos de un solo uso para verificación de correo y recuperación de contraseña.

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
