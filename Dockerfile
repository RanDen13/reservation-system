# syntax=docker/dockerfile:1

FROM node:24-slim AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl unoconv libreoffice-writer fontconfig fonts-dejavu fonts-liberation \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

FROM base AS builder

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
RUN pnpm rebuild better-sqlite3

COPY prisma ./prisma/
RUN pnpm exec prisma generate --schema ./prisma/schema.prisma

COPY . .
RUN pnpm run build

FROM base AS runner

ENV NODE_ENV=production

# Install build tools needed for better-sqlite3 runtime
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated/prisma ./generated/prisma

# Install production dependencies and rebuild better-sqlite3 for runtime
RUN pnpm install --frozen-lockfile --prod && pnpm rebuild better-sqlite3

EXPOSE 3000

CMD ["pnpm", "start"]
