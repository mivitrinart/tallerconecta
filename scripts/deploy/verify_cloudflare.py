#!/usr/bin/env python3
"""
Verificación pre-despliegue a Cloudflare - Taller Conecta.

Comprueba, antes de ejecutar `npm run deploy`, que:
  1. wrangler.toml / wrangler.jsonc no contienen secretos en [vars].
  2. Existe el binding de D1 configurado.
  3. Existe el esquema SQL (schema.sql) y la última migración de seguridad.
  4. .env.example documenta las variables necesarias sin valores reales.
  5. package.json define los scripts de build y deploy de Cloudflare.

Uso:
    python3 scripts/deploy/verify_cloudflare.py
Exit code 0 = listo para desplegar; 1 = corregir antes de desplegar.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def leer(rel: str) -> str:
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def main() -> int:
    errores = []

    # 1. Secretos en configuración de Cloudflare
    for cfg in ("wrangler.toml", "wrangler.jsonc"):
        ruta = os.path.join(ROOT, cfg)
        if not os.path.exists(ruta):
            continue
        contenido = leer(cfg)
        for linea in contenido.splitlines():
            if re.search(r"(PASS|PASSWORD|API_KEY|SECRET|TOKEN)\s*[:=]\s*[\"']?[^\"'\s#]{6,}", linea, re.I):
                if "TU_" not in linea and "placeholder" not in linea.lower():
                    errores.append(f"{cfg}: posible secreto en línea: {linea.strip()[:60]}…")

    # 2. Binding D1
    wrangler = leer("wrangler.toml")
    if "d1_databases" not in wrangler or "taller_conecta_db" not in wrangler:
        errores.append("wrangler.toml: falta el binding D1 'taller_conecta_db'")

    # 3. Esquema y migración de seguridad
    if not os.path.exists(os.path.join(ROOT, "schema.sql")):
        errores.append("Falta schema.sql (esquema D1)")
    migraciones = os.path.join(ROOT, "supabase", "migrations")
    if not os.path.isdir(migraciones) or not any(
        f.startswith("0008") for f in os.listdir(migraciones)
    ):
        errores.append("Falta la migración PL/pgSQL 0008_security_hardening.sql")

    # 4. .env.example sin valores reales
    env_example = leer(".env.example")
    for linea in env_example.splitlines():
        if linea.strip().startswith("#"):
            continue  # los comentarios no son valores reales
        if re.search(r"(PASS|API_KEY|SECRET)\s*=\s*[^\s#]{8,}", linea, re.I) and "tu_" not in linea.lower():
            errores.append(f".env.example: posible valor real en: {linea.strip()[:60]}…")

    # 5. Scripts de despliegue
    pkg = json.loads(leer("package.json"))
    for script in ("cf-build", "deploy"):
        if script not in pkg.get("scripts", {}):
            errores.append(f"package.json: falta el script '{script}'")

    if errores:
        print("🔴 NO está listo para desplegar:")
        for e in errores:
            print(f"  - {e}")
        return 1
    print("✅ Verificación pre-despliegue OK. Listo para: npm run deploy")
    print("   Recuerda configurar secretos con: npx wrangler secret put SMTP_API_KEY")
    return 0


if __name__ == "__main__":
    sys.exit(main())
