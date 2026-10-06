# syntax = docker/dockerfile:1

# Node 24 runs the TypeScript server directly (type stripping) and ships
# SQLite built in, so the image needs no install step and no native builds.
# The database lives on the /data volume that fly.toml mounts.
FROM docker.io/library/node:24.21.0-alpine
WORKDIR /app
COPY server.ts markdown.ts README.md ./
COPY public/ ./public/
COPY docs/ ./docs/
ENV NODE_ENV=production DATA_DIR=/data
CMD ["node", "--disable-warning=ExperimentalWarning", "server.ts"]
