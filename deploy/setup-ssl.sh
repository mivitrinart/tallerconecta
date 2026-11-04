#!/usr/bin/env bash
# setup-ssl.sh — Obtener certificado SSL inicial para tallerconecta.co
# Ejecutar UNA vez en el servidor (requiere dominio apuntando al servidor)

set -e

DOMAIN="tallerconecta.co"
EMAIL="${1:-admin@tallerconecta.co}"

echo "==> Levantando nginx (solo HTTP) para validación ACME..."
cd "$(dirname "$0")"
docker compose up -d nginx

echo "==> Solicitando certificado SSL para $DOMAIN..."
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" -d "www.$DOMAIN" \
  --email "$EMAIL" --agree-tos --no-eff-email

echo "==> Recargando nginx con SSL..."
docker compose exec nginx nginx -s reload

echo "==> ¡Listo! Sitio disponible en https://$DOMAIN"
