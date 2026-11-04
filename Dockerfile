# ── Taller Conecta · imagen para VPS/Railway/Fly/Render con disco persistente ──
FROM node:20-alpine AS base
WORKDIR /app

# Dependencias completas para compilación (TypeScript + Tailwind v4 PostCSS)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Build (solo archivos necesarios; .env nunca se copia a la imagen)
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build && npm prune --omit=dev

# Runtime: usuario no-root
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Railway/Render inyectan PORT dinámico; escucha en todas las interfaces
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

# Copia solo el resultado del build y node_modules de producción
COPY --from=base /app/.next ./.next
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/public ./public

# Crear /app/.data con permisos de escritura para el usuario node ANTES de VOLUME y USER
RUN mkdir -p /app/.data && chown -R node:node /app/.data
# El modo demo escribe en .data/ → monta un volumen persistente ahí (Railway)
VOLUME ["/app/.data"]

# Usuario no-root: nunca corra como root en contenedor
USER node

# Exigir AUTH_SECRET ≥ 32 caracteres en producción antes de arrancar
CMD ["sh", "-c", "if [ -z \"$AUTH_SECRET\" ] || [ ${#AUTH_SECRET} -lt 32 ]; then echo 'FATAL: AUTH_SECRET debe definirse con al menos 32 caracteres en producción' >&2; exit 1; fi; npm run start -- -H 0.0.0.0 -p ${PORT:-3000}"]
