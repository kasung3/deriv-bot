FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY .npmrc ./
RUN npm install --legacy-peer-deps

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT_MODE=standalone
ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy

# Force standalone output and clean experimental section
RUN sed -i "s/output: process.env.NEXT_OUTPUT_MODE/output: 'standalone'/" next.config.js && \
    sed -i "s/experimental: {[^}]*}/experimental: {}/" next.config.js && \
    cat next.config.js

RUN npx prisma generate
RUN npm run build

# Debug: Check standalone structure
RUN echo "=== .next contents ===" && ls -la .next/ && \
    echo "=== standalone contents ===" && ls -la .next/standalone/ && \
    echo "=== Looking for server.js ===" && find .next -name "server.js" -type f 2>/dev/null || echo "No server.js found"

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone/app ./
COPY --from=builder /app/.next/static ./.next/static
# Copy Prisma client from standalone node_modules (if exists) or from builder
COPY --from=builder /app/.next/standalone/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/.next/standalone/app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
