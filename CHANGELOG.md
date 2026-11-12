# Changelog

All notable changes to `@meddleware/treasury-ui` are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/). Before 0.2.0, breaking changes ship as patch releases.
Releases before 0.0.18 are recorded in the git history only.

## [0.0.28] - 2026-11-12

### Changed

- The standalone page shows the Meddleware mark beside "Treasury" in the header (`@meddleware/ui` ^0.1.41), and the browser tab, home-screen and web-manifest icons are the shared brand icon set. The app keeps no icon of its own: `public/favicon.svg` and the `<link rel="icon">` in `index.html` are removed, and `meddlewareApp` (`@meddleware/frontend-config` ^0.0.8, `name: 'Treasury'`) emits `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` and `site.webmanifest` and injects the links.
- The footer's developer link now goes to the Treasury page of the developer site (`https://meddleware.dev/sui/treasury/`, the shell's default for this tool) instead of the Sui landing page.
- No third-party fonts, scripts, styles, images or analytics: the only outside calls are the Sui node and the optional read-index the tool exists to use. CI workflows set `DO_NOT_TRACK=1`.
- Internal: `@meddleware/web-utils` ^0.0.4. New tests: the mark in the header, no icon of the app's own, and (over the built `dist/`, run in CI after the build) the icon set once per page, no font file or font host, no third-party load and no origin beyond this site, the explorers and the protocol endpoints.

## [0.0.27] - 2026-11-07

### Changed

- The console says plainly what it cannot show. A network with no recorded `access_gate` deployment reads "The treasury is not available on mainnet. Switch to testnet." (the networks offered come from the deployment records) and the tabs give way to that message; any other failed read reads "The treasury cannot be read right now. Try again later." instead of the raw error, and the technical cause is written to the console. When the read-index is configured but cannot be used, the events are still listed from the node and a note says only recent events are listed. A failed read of the revenue sources, the balance or the platform settings is now shown (it used to look like an empty list or a dash).
- Words for a reader: the Overview's "ckpt 90000" is "checkpoint 90000"; the Activity column "Block" is "Checkpoint" with an explanation of what a checkpoint is, and the line above the table says from which checkpoint events are listed; the commission is shown as a percentage without "(20 bps)"; "Accesses minted/consumed" are "Passes sold/used", "Active gates" is "Gates" (it counted paused ones too), "PlatformConfig not loaded." is "No platform settings to show yet.", and the event labels read "Access sold" / "Access used" on both tabs. The package author and licence holder are spelled "Meddleware".
- The standalone page is the shared `AppToolShell` of `@meddleware/ui` ^0.1.40 (page heading "Treasury"; the network badge stays in the header); the network comes from `selectBuiltNetwork` and `useNetwork().explorerNetwork` of `@meddleware/wallet-adapter` ^0.0.22, so the peer range is now `>=0.0.22 <0.2.0`. `TreasuryView` is exported unchanged.
- Internal: Vite, Vitest and TypeScript configuration come from `@meddleware/frontend-config` ^0.0.7 (`meddlewareApp`, `vueTestConfig`, the `vue-app` tsconfig base; the e2e build mode and its stub chain are unchanged); the audit gate and the licence notices run its `mw-audit-gate` and `mw-third-party-licenses` (the local copies are deleted); `mw-sync --check` and an inline-script check against the Content-Security-Policy (`check:csp`, also a Dockerfile step) run in CI; `@meddleware/web-utils` ^0.0.3.
- Tests for the shell, the availability messages and the console cause, the indexer note, the tabs' wording and the wording of every template and the page head.

## [0.0.26] - 2026-11-06

### Added

- An end-to-end build mode (`npm run build:e2e`) with a stub chain, so the browser tests sweep the console WITH data (a balance, three gates, 26 events over two pages); `?chain=down` keeps the error states covered. Guarded as in the wallet apps: mode-and-flag gate, `assertE2eOnlyInE2eMode`, `check-prod-bundle` in CI and the image build, a refused production `VITE_E2E=1` build, `!src/e2e*.ts` in the tarball.

### Changed

- Takes `@meddleware/ui` ^0.1.39 (the tab list items use `role="none"`) and the Dependabot merges of 2026-11-06: image bases `static-server` 0.1.12 and a refreshed `node` build image, and newer dev tools.

## [0.0.25] - 2026-11-05

### Fixed

- The shared chain loader is scoped to the network epoch: switching network starts its own load instead of returning the previous network's data.

### Changed

- Dependency alignment: `@meddleware/ui` ^0.1.38 (form-field edge contrast, sticky-offset and focus-not-obscured fixes), `@meddleware/design-tokens` ^0.1.13, `@meddleware/web-utils` ^0.0.2 and `@meddleware/frontend-config` ^0.0.2 (the shared sweep now also checks that focus is not hidden behind fixed content).

## [0.0.24] - 2026-10-31

- Shared chain context, ui components and accessibility gates

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
