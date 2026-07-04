# Hosted CoralOS market backend for Relix.
#
# One container = Coral Server (JVM) + the Relix buyer/seller agent bundle + the
# agent registry + a shared /data dir + the Node HTTP wrapper. Vercel calls the
# wrapper's POST /market; the wrapper runs the full CoralOS coordination round
# inside the container (where server + agents + files are co-located) and returns
# bids + proof. It never touches escrow and never needs Phantom.
#
# Build:  docker build -t relix-coralos .
# Run:    see docs/HOSTED_CORALOS.md

# ---- build stage: bundle the agent + wrapper with esbuild ----
# Node 22+ to satisfy this project's own declared engines (commander@15,
# @solana/wallet-standard-*), and to match the npm major version (11.x) the
# lock file was generated with — npm 10.x (bundled with Node 20) reads the
# optional wasm-resolver dependency entries more strictly and rejects `npm ci`
# even though the lock file is in sync.
FROM node:22-bookworm AS build
# Pin npm to the same major version the lock file was generated with, so `npm
# ci`'s optional-dependency resolution matches exactly regardless of whichever
# npm the base image happens to bundle.
RUN npm install -g npm@11
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run coralos:build && npm run coralos:server:build

# ---- runtime stage: JRE 24 (Coral Server) + Node 20 (agents + wrapper) ----
# Temurin does not publish a `24-jre-jammy` tag; `24-jre` is the default
# Debian/Ubuntu-based multi-arch image (incl. arm64) and works with nodesource.
FROM eclipse-temurin:24-jre

# Node is needed both for the wrapper and for the agent processes the Coral
# Server launches via its executable runtime.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
 && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/relix

# Coral Server jar (downloaded from the published coralos-dev package). Override
# the version with --build-arg CORAL_SERVER_TARBALL=... if needed.
ARG CORAL_SERVER_TARBALL=https://registry.npmjs.org/coralos-dev/-/coralos-dev-1.1.0-SNAPSHOT-deveximprovement-4.tgz
RUN curl -fsSL "$CORAL_SERVER_TARBALL" -o /tmp/coral.tgz \
 && tar -xzf /tmp/coral.tgz -C /tmp \
 && mv /tmp/package/bin/coral-server.jar /opt/relix/coral-server.jar \
 && rm -rf /tmp/coral.tgz /tmp/package

# App bundles
COPY --from=build /app/scripts/coralos/dist/agent.mjs /opt/relix/agents/agent.mjs
COPY --from=build /app/scripts/coralos/dist/coralos-server.mjs /opt/relix/coralos-server.mjs

# Config + registry (container-absolute paths) + entrypoint
COPY docker/coral-server-config.toml /opt/relix/coral-server-config.toml
COPY docker/coral-agents/ /root/.coral/agents/
COPY docker/start.sh /opt/relix/start.sh
RUN chmod +x /opt/relix/start.sh && mkdir -p /data

ENV RELIX_DATA_DIR=/data \
    CORAL_SERVER_URL=http://localhost:5555 \
    RELIX_CORALOS_ENABLED=1 \
    CORAL_NAMESPACE=relix \
    PORT=8080

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD curl -fsS "http://localhost:${PORT}/health" || exit 1

CMD ["/opt/relix/start.sh"]
