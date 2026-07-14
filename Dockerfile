# syntax=docker/dockerfile:1

FROM node:22-slim AS build
RUN corepack enable
WORKDIR /app

# better-sqlite3 and @node-rs/argon2 are native addons — prebuilt binaries
# cover most platforms, but keep compile tools available as a fallback.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @baykus/web build
RUN pnpm --filter @baykus/server build
# `pnpm prune --prod` at the workspace root treats the root package.json
# (devDependencies only, no "dependencies") as the pruning target and wipes
# node_modules entirely — a fresh --prod install correctly resolves each
# workspace package's own prod deps instead.
RUN rm -rf node_modules apps/*/node_modules packages/*/node_modules
RUN pnpm install --prod --frozen-lockfile

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    BAYKUS_DATA_DIR=/data \
    BAYKUS_MIGRATIONS_DIR=/app/packages/core/migrations \
    BAYKUS_WEB_DIST=/app/apps/web/dist \
    PORT=4004

# The whole pruned workspace is copied (not just apps/server/dist) because
# apps/server/dist/main.js is bundled but still imports real npm packages
# (hono, better-sqlite3, drizzle-orm, ...) via pnpm's workspace node_modules
# symlinks, which point back into the root node_modules/.pnpm store —
# splitting them up risks breaking that relative symlink structure.
COPY --from=build /app /app

VOLUME /data
EXPOSE 4004

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://localhost:4004/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "apps/server/dist/main.js"]
