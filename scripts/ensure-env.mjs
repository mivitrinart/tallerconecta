/**
 * Garantiza que exista un `.env` local con un AUTH_SECRET aleatorio de 64 caracteres
 * antes de arrancar `npm run dev`, evitando errores al descomprimir el proyecto por primera vez.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env");
const envLocalPath = path.join(root, ".env.local");
const examplePath = path.join(root, ".env.example");

function extractSecret(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^\s*AUTH_SECRET\s*=\s*(.+?)\s*$/m);
  if (!match) return null;
  return match[1].replace(/^["']|["']$/g, "").trim();
}

function isValidSecret(secret) {
  return Boolean(secret && secret.length >= 32 && !secret.toLowerCase().startsWith("cambiar-por-un-secreto"));
}

const currentEnvSecret = extractSecret(envLocalPath) ?? extractSecret(envPath) ?? process.env.AUTH_SECRET?.trim();

if (!isValidSecret(currentEnvSecret)) {
  const generated = crypto.randomBytes(32).toString("hex");
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, "utf8");
    const updated = /^\s*AUTH_SECRET\s*=/m.test(raw)
      ? raw.replace(/^\s*AUTH_SECRET\s*=.*$/m, `AUTH_SECRET=${generated}`)
      : `${raw.trimEnd()}\nAUTH_SECRET=${generated}\n`;
    fs.writeFileSync(envPath, updated, "utf8");
    console.log("✓ .env actualizado automáticamente con un AUTH_SECRET aleatorio de 64 caracteres.");
  } else if (fs.existsSync(examplePath)) {
    const template = fs.readFileSync(examplePath, "utf8");
    const created = template.replace(/^\s*AUTH_SECRET\s*=.*$/m, `AUTH_SECRET=${generated}`);
    fs.writeFileSync(envPath, created, "utf8");
    console.log("✓ .env creado automáticamente desde .env.example con un AUTH_SECRET aleatorio de 64 caracteres.");
  } else {
    fs.writeFileSync(envPath, `DATA_MODE=demo\nAUTH_SECRET=${generated}\n`, "utf8");
    console.log("✓ .env creado automáticamente con DATA_MODE=demo y AUTH_SECRET de 64 caracteres.");
  }
}
