# Changelog

All notable changes to `@meddleware/treasury-ui` are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/). Before 0.2.0, breaking changes ship as patch releases.
Releases before 0.0.18 are recorded in the git history only.

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
