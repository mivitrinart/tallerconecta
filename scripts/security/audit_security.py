#!/usr/bin/env python3
"""
Auditoría de seguridad del repositorio - Taller Conecta.

Escanea el árbol del proyecto (excluyendo .git, node_modules, builds) buscando:
  1. Secretos hardcodeados (API keys, contraseñas, tokens, claves privadas).
  2. Archivos .env commiteados o presentes fuera de .gitignore.
  3. Uso de 'eval(' / dangerouslySetInnerHTML sin sanitizar en el código fuente.
  4. Configuración de wrangler con secretos en [vars] (deben usar `wrangler secret`).
  5. CSP débil ('unsafe-eval' en next.config / middleware).

Uso:
    python3 scripts/security/audit_security.py
Exit code 0 = sin hallazgos críticos; 1 = encontró problemas.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

EXCLUIR_DIRS = {".git", "node_modules", ".open-next", ".wrangler", ".next", "__pycache__", ".venv", "tests"}
EXCLUIR_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".woff", ".woff2", ".pdf", ".lock", ".zip"}

# Patrones de secretos (alto falso-positivo controlado con contexto)
PATRONES_SECRETOS = [
    (re.compile(r"(api[_-]?key|secret|password|passwd|token)\s*[:=]\s*['\"][^'\"]{8,}['\"]", re.I), "posible secreto asignado en texto plano"),
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"), "clave privada PEM"),
    (re.compile(r"(AKIA|ASIA)[0-9A-Z]{16}"), "clave de acceso AWS"),
    (re.compile(r"xox[baprs]-[0-9A-Za-z-]{10,}"), "token de Slack"),
    (re.compile(r"ghp_[0-9A-Za-z]{36}"), "token personal de GitHub"),
    (re.compile(r"sk-[0-9A-Za-z]{20,}"), "API key estilo OpenAI"),
    (re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"), "JWT hardcodeado"),
]

PATRONES_PELIGROSOS = [
    (re.compile(r"dangerouslySetInnerHTML"), "dangerouslySetInnerHTML (verificar sanitización)"),
    (re.compile(r"\beval\s*\("), "eval() en código fuente"),
]

# Claves que SÍ pueden ir en texto plano (no son secretos)
CLAVES_PERMITIDAS = {"secret_key_demo", "placeholder", "tu_", "example", "changeme", "xxx"}


def es_secreto_real(linea: str) -> bool:
    low = linea.lower()
    return not any(c in low for c in CLAVES_PERMITIDAS)


def recorrer_archivos():
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in EXCLUIR_DIRS]
        for nombre in filenames:
            ext = os.path.splitext(nombre)[1].lower()
            if ext in EXCLUIR_EXT:
                continue
            yield os.path.join(dirpath, nombre)


def main() -> int:
    hallazgos = []
    archivos_env = []

    for ruta in recorrer_archivos():
        rel = os.path.relpath(ruta, ROOT)
        base = os.path.basename(ruta)
        if base.startswith(".env") and base != ".env.example":
            archivos_env.append(rel)
        try:
            with open(ruta, "r", encoding="utf-8", errors="ignore") as f:
                lineas = f.readlines()
        except OSError:
            continue
        for i, linea in enumerate(lineas, 1):
            if base in ("wrangler.toml", "wrangler.jsonc") and re.search(r"(SMTP_PASS|SMTP_USER|API_KEY|SECRET)\s*[:=]", linea, re.I):
                if es_secreto_real(linea):
                    hallazgos.append(f"{rel}:{i}: secreto en configuración de Cloudflare → usar `wrangler secret put`")
            for patron, desc in PATRONES_SECRETOS:
                if patron.search(linea) and es_secreto_real(linea):
                    hallazgos.append(f"{rel}:{i}: {desc}")
                    break
            if base.endswith((".ts", ".tsx", ".mjs")):
                for patron, desc in PATRONES_PELIGROSOS:
                    if patron.search(linea):
                        hallazgos.append(f"{rel}:{i}: {desc}")

    # next.config / middleware: CSP con unsafe-eval está prohibido
    for config in ("next.config.mjs", "middleware.ts"):
        ruta = os.path.join(ROOT, config)
        if os.path.exists(ruta):
            with open(ruta, encoding="utf-8") as f:
                contenido = f.read()
            # Solo cuenta si aparece como valor de CSP (con comillas), no en comentarios
            if re.search(r"['\"]unsafe-eval['\"]", contenido):
                hallazgos.append(f"{config}: CSP permite 'unsafe-eval' (endurecer)")

    # .env reales no deben estar en git
    gitignore = os.path.join(ROOT, ".gitignore")
    cubierto = False
    if os.path.exists(gitignore):
        with open(gitignore, encoding="utf-8") as f:
            cubierto = any(l.strip().startswith(".env") for l in f if l.strip() and not l.startswith("#"))
    # Solo alertar si el .env está trackeado en git (ese sí es un riesgo real)
    import subprocess
    try:
        tracked = subprocess.run(
            ["git", "ls-files", "--error-unmatch", archivos_env[0]] if archivos_env else ["git", "ls-files"],
            capture_output=True, text=True, cwd=ROOT,
        )
        tracked_env = [l for l in tracked.stdout.splitlines() if l.startswith(".env") and l != ".env.example"]
    except Exception:
        tracked_env = archivos_env if not cubierto else []
    for rel in tracked_env:
        hallazgos.append(f"{rel}: archivo .env real COMMITEADO en git (¡eliminarlo y rotar secretos!)")

    if hallazgos:
        print("🔴 HALLAZGOS DE SEGURIDAD:")
        for h in hallazgos:
            print(f"  - {h}")
        return 1
    print("✅ Auditoría de seguridad limpia: sin secretos hardcodeados ni CSP débil.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
