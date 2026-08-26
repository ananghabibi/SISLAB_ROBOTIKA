# =============================================================================
# SILAB — image produksi untuk mini PC laboratorium.
# Multi-stage agar image akhir kecil dan cepat dimuat ulang saat listrik padam.
# =============================================================================

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl tzdata
ENV NODE_ENV=production
ENV TZ=Asia/Jakarta
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S nodejs && adduser -S silab -u 1001

# Keluaran "standalone" sudah memuat node_modules seperlunya saja.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=silab:nodejs /app/.next/standalone ./
COPY --from=builder --chown=silab:nodejs /app/.next/static ./.next/static

# Prisma CLI + skema dibutuhkan untuk `migrate deploy` saat kontainer mulai.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/data ./data
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

RUN mkdir -p /app/uploads && chown -R silab:nodejs /app/uploads
VOLUME ["/app/uploads"]

USER silab
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
