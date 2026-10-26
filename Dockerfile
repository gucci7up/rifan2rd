# Imagen para Dokploy (Build Type: Dockerfile).
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# El repo no tiene carpeta public/ (git no guarda carpetas vacías); se crea para el COPY del runner.
RUN mkdir -p public
RUN npx prisma generate && npx next build

FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/app/uploads
# CLI de Prisma para aplicar migraciones al arrancar (misma versión que package.json).
RUN npm install -g prisma@6.19.3 && addgroup -S app -g 1001 && adduser -S app -u 1001 -G app
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/prisma ./prisma
RUN mkdir -p /app/uploads && chown app:app /app/uploads
USER app
EXPOSE 3000
VOLUME ["/app/uploads"]
CMD ["sh", "-c", "prisma migrate deploy && node server.js"]
