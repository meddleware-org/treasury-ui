# ── build stage ───────────────────────────────────────────────────────────────
# Standalone build — the Docker context is this repo root. @meddleware/* dependencies resolve
# from npm, so @meddleware/wallet-adapter, @meddleware/ui, and @meddleware/design-tokens must
# be published before this image is built.
#
# VITE_* build args (baked into the static bundle at build time):
#   VITE_NETWORK                              — "testnet" | "mainnet" (default testnet)
#   VITE_INDEXER_URL                          — read-indexer base URL (optional; display data, falls back to the full node)
# The access_gate ids come from @meddleware/access-gate-client/deployments, not from build args.
# Content-Security-Policy served by static-server (verified 2026-09-30: production build loaded in
# Chromium under this policy with zero violations). script-src stays 'self'; connect-src allows
# any https origin because RPC, relay, aggregator and Seal key-server hosts are partly operator- or
# chain-configured; img-src allows https:/data:/blob: for on-chain images and local previews.
ARG CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests"

FROM node:24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
COPY . .

ARG VITE_NETWORK=testnet
ARG VITE_INDEXER_URL

ENV VITE_NETWORK=${VITE_NETWORK} \
    VITE_INDEXER_URL=${VITE_INDEXER_URL}

RUN npm run build

# ── runtime stage ─────────────────────────────────────────────────────────────
FROM quay.io/meddleware-org/static-server:0.1.2@sha256:87fb66d451e5846ea3af24266cc82546fa465afab5494d00261eeda6a70195b1
ARG CSP
ENV CONTENT_SECURITY_POLICY="${CSP}"

COPY --from=build /app/dist /app/public

ENV SERVE_DIR=/app/public \
    SPA_FALLBACK=true \
    CACHE_IMMUTABLE_PREFIX=/assets/

EXPOSE 8080
