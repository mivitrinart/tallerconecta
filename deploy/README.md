# Despliegue público tallerconecta.co con SSL

## Requisitos
- VPS con Docker y Docker Compose instalados
- Dominio `tallerconecta.co` apuntando (registro A) a la IP pública del servidor

## Pasos
1. Copia la carpeta del proyecto al servidor.
2. En `deploy/`: crea `.env` con `AUTH_SECRET=<frase larga aleatoria>`.
3. `docker compose up -d --build` (levanta app + nginx).
4. `bash setup-ssl.sh admin@tallerconecta.co` (obtiene certificado Let's Encrypt).
5. Verifica `https://tallerconecta.co/api/health`.

La renovación del certificado es automática cada 12 h vía el contenedor `certbot`.
