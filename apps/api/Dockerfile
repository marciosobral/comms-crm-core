# Build context: repository root.
FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
# prisma.config.ts reads DATABASE_URL even for `prisma generate`, which never connects.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm --filter @comms-core/api... build

# The runtime keeps the whole workspace: the Prisma CLI runs migrations on start and
# `pnpm db:seed` needs tsx.
FROM base AS runtime
ENV NODE_ENV=production
ENV TZ=America/Sao_Paulo
COPY --from=build /repo /repo
WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/src/main.js"]
