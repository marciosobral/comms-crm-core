# Build context: repository root.
FROM node:22-bookworm-slim AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
# Baked into the client bundle at build time.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_APP_NAME=CRM
ENV VITE_APP_NAME=$VITE_APP_NAME
# Optional ./branding (not in git) replaces the neutral logos and icons in public/.
RUN if [ -d branding ]; then cp -r branding/. apps/web/public/; fi
RUN pnpm --filter @comms-core/web... build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=build /repo/apps/web/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
