# ── build stage ───────────────────────────────────────────────────────────────
# Standalone build — the Docker context is this repo root. @meddleware/* dependencies resolve
# from npm, so @meddleware/wallet-adapter, @meddleware/ui, and @meddleware/design-tokens must
# be published before this image is built.
#
# VITE_* build args (baked into the static bundle at build time):
#   VITE_NETWORK                              — "testnet" | "mainnet" (default testnet)
#   VITE_RPC_TESTNET                          — override default Sui gRPC URL (optional)
#   VITE_RPC_MAINNET                          — override default Sui gRPC URL (optional)
#   VITE_ACCESS_GATE_PACKAGE_ID_MAINNET       — access_gate package ID on mainnet (optional)
#   VITE_PLATFORM_CONFIG_ID_MAINNET           — PlatformConfig object ID on mainnet (optional)
FROM node:24-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
COPY . .

ARG VITE_NETWORK=testnet
ARG VITE_RPC_TESTNET
ARG VITE_RPC_MAINNET
ARG VITE_ACCESS_GATE_PACKAGE_ID_MAINNET
ARG VITE_PLATFORM_CONFIG_ID_MAINNET

ENV VITE_NETWORK=${VITE_NETWORK} \
    VITE_RPC_TESTNET=${VITE_RPC_TESTNET} \
    VITE_RPC_MAINNET=${VITE_RPC_MAINNET} \
    VITE_ACCESS_GATE_PACKAGE_ID_MAINNET=${VITE_ACCESS_GATE_PACKAGE_ID_MAINNET} \
    VITE_PLATFORM_CONFIG_ID_MAINNET=${VITE_PLATFORM_CONFIG_ID_MAINNET}

RUN npm run build

# ── runtime stage ─────────────────────────────────────────────────────────────
FROM quay.io/meddleware-org/static-server:0.1.1

COPY --from=build /app/dist /app/public

ENV SERVE_DIR=/app/public \
    SPA_FALLBACK=true \
    CACHE_IMMUTABLE_PREFIX=/assets/

EXPOSE 8080
