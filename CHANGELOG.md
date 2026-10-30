# Changelog

All notable changes to `@meddleware/treasury-ui` are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/). Before 0.2.0, breaking changes ship as patch releases.
Releases before 0.0.18 are recorded in the git history only.

## [0.0.23] - 2026-10-30

- Dependency updates (minor and patch groups) and workflow action bumps. No source change.

## [0.0.22] - 2026-10-30

- Point the developer-docs and indexer links at the machine zone (ADR-0005); current @meddleware packages.

## [0.0.21] - 2026-10-24

### Changed

- Machine-zone endpoints (the indexer and the Walrus relays) can be overridden at deploy time by a same-origin `/runtime-config.json` (`@meddleware/ui` 0.1.34 `loadRuntimeConfig`), so the image is built once and moved between Cloudflare zones by configuration (workspace ADR-0005). Without the file the build-time values apply, as before.
- Ships its own `robots.txt` (Content Signals `search=yes, ai-input=yes`) and `llms.txt` instead of static-server's defaults.

## [0.0.20] - 2026-10-22

### Changed

- Image base: static-server 0.1.11 (Go 1.26.10 standard library, CVE-2026-111943, so the scan-before-sign gate passes)

## [0.0.19] - 2026-10-22

### Changed

- @meddleware/access-gate-client ^0.0.10: a stale indexer head page (polledAt older than 60 s) now falls back to the node

## [0.0.18] - 2026-10-18

### Added

- `LICENSE` (0BSD, as the package declares; audit F12).
- `tests/design-tokens-used.test.ts`: no component or stylesheet draws `--warning` as a text colour, and every
  custom property the app reads is defined by design-tokens (audit F11).

### Changed

- Dependencies: `@meddleware/access-gate-client` ^0.0.9, `@meddleware/design-tokens` ^0.1.10,
  `@mysten/sui` ^2.36.0.
- Image base: static-server 0.1.8 (`sha256:e32cf42b…4000`).
- `npm-publish.yml` `verify` calls `node-ci.yml` (type-check, all linters, tests, build, licences), as the
  image release does (audit F14).

### Removed

- The unused `.dao-notice` rule in `qt.css`, which drew `--warning` as text (2.0:1 on the light canvas; audit F11).
