# syntax=docker/dockerfile:1

# 1. Base stage: Node.js 20 sobre Alpine Linux con dependencias nativas
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# 2. Dependencies stage: instala dependencias del proyecto
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY prisma ./prisma/
RUN pnpm install --frozen-lockfile

# 3. Builder stage: genera Prisma Client y construye la app en modo standalone
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Variables de entorno requeridas en build time para la validación estática
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sigtedb?schema=public"
ENV JWT_SECRET="build-time-secret-key-that-is-at-least-32-chars-long"

RUN pnpm prisma generate
RUN pnpm build

# 4. Runner stage: imagen final optimizada de producción
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN apk add --no-cache libc6-compat openssl

# Instalación global de Prisma CLI para migraciones en el entrypoint
RUN npm install -g prisma@6.19.3

# Usuario sin privilegios por seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Configuración de directorio para cache de Next.js
RUN mkdir .next && chown nextjs:nodejs .next

# Copiar archivos públicos y el bundle standalone generado por Next.js
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copiar esquema de Prisma y migraciones para el entrypoint
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma


# Script de entrada para ejecutar migraciones al iniciar
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
