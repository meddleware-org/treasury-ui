# Security Audit — `treasury-ui`

**Classification:** Internal security review
**Project:** `repos/treasury-ui` — `@meddleware/treasury-ui`, Vue 3 organisation treasury console (overview, accounts, activity; standalone SPA + `TreasuryView` library, embedded in the dashboard)
**Project type:** Vue app + UI library
**Template:** AUDIT_TEMPLATE.md (2026-10-08) + AUDIT_TEMPLATE_SUI_CLIENT.md (2026-10-08) + AUDIT_TEMPLATE_TS.md (2026-10-08) + AUDIT_TEMPLATE_VUE.md (2026-10-08) + AUDIT_TEMPLATE_IMG.md (2026-10-08)
**Sui SDK:** `@mysten/sui ^2.33.2` (installed 2.35.0, one copy; `npm ls` single version)   **Transport:** gRPC through wallet-adapter; optional read-indexer over HTTPS
**Networks:** testnet (recorded deployment); any other network reports "no deployment" instead of querying
**On-chain packages consumed:** `access_gate` (reads only) through `@meddleware/access-gate-client/deployments` (0.0.8: testnet `0xd7ddaa94…88c9`, PlatformConfig `0x3f81489d…e7b5`; reads use `originalId`)
**Package manager / lockfile:** npm 11, committed (also copied into the image for SBOM tools)   **Module format / publish model:** ESM; ships source (library) + SPA image
**Runtime targets:** browser   **Peer dependencies:** `@meddleware/wallet-adapter >=0.0.12 <0.2.0`
**Build tool:** vite 8.3, `@vitejs/plugin-vue` 6.0.9, vue 3.5.43, vue-tsc 3.3.x, TypeScript 6.0.3, vitest 5.0.3
**Hosting:** container image on static-server (CSP and HSTS from the server); no static-host `_headers` file
**Embedding hosts:** the dashboard (`TreasuryView`, own scoped `qt.css`, no shell chrome; dashboard requires `^0.0.16`)
**VITE_\* inventory:** `VITE_NETWORK` (testnet|mainnet, baked, selects the network only), `VITE_INDEXER_URL` (optional read-indexer base URL, baked, display data), `VITE_DOCS_URL` / `VITE_DEV_URL` (footer links, baked); all public, none selects an on-chain id; all four are in `.env.example`
**Images:** `quay.io/meddleware-org/treasury-ui:0.0.17@sha256:8e155ce3…b259` (Docker Hub mirror; cosign keyless, SPDX SBOM attestation, build provenance; verified 2026-10-09, `verify-digests.sh` 16/16)
**Base images:** build `node:24-slim@sha256:0e0ff40c…f9b6`; runtime `quay.io/meddleware-org/static-server:0.1.7@sha256:2e227311…2379` (Go 1.26.9)
**Runtime user:** `USER 65534:65534`   **Runtime FS:** read-only root, no writable mounts
**Deployed by:** `post-bootstrap/treasury-ui/overlays/default`; digest from `config/images.yaml`
**Build args:** `VITE_NETWORK`, `VITE_INDEXER_URL` and `CSP` — none secret, none a test switch
**Deployment status:** npm v0.0.17 (2026-10-09); image `quay.io/meddleware-org/treasury-ui` serving `treasury.meddleware.co.uk` at 0.0.17 (`sha256:8e155ce3…`, deployed 2026-10-09; live bundle carries only `access_gate` `0xd7ddaa94…` and PlatformConfig `0x3f81489d…`); embedded in dashboard 0.1.84
**Review date:** 2026-10-03 (first pass) · re-verified 2026-10-09
**Reviewer:** Internal review
**Severity ceiling:** Low — read-only; nothing is signed and no wallet is needed.
**Status:** re-verified 2026-10-09

---

## Executive summary

The organisation's accounting view: the platform's `PlatformConfig` (treasury address, commission),
the treasury's SUI, the gates the treasury administers, and recent mints and consumes. It shares
dao-ui's foundation without the governance surface. Every object and event read goes through
access-gate-client; the app formats and renders. The B3 work (reads through the domain client,
network from wallet-adapter, `.env.example`) is already in place.

This first pass found and fixed, in 0.0.10:

- **F3 (Low)** — the treasury balance counted only coin objects, leaving out SUI held in the
  treasury's address balance (SIP-58).
- **F4 (Low)** — the treasury and epoch reads had no stale-result guard across network switches.
- **F5 (Info)** — `SECURITY.md` described dao-ui's export and composables.

Re-verified 2026-10-09 (0.0.17; 12 unit tests, type-check and all three linters green, audit gate
1 allowlisted / 0 open; live site `treasury.meddleware.co.uk` read the same day). F1 to F6 hold. Since
the first pass:

- **F7 (Low, RESOLVED 0.0.13)** — the treasury address is shown in full.
- **F9 (Low, RESOLVED 0.0.16–0.0.17)** — the image release runs the full CI workflow, scans the
  published image before cosign signs it, ships the lockfile for SBOM tools, serves
  `/THIRD_PARTY_LICENSES`, runs as an explicit `USER 65534:65534` on static-server 0.1.7, and the pod
  sets `automountServiceAccountToken: false`.
- The newly applicable lens checks found three defects that are **not yet fixed** (code changes are
  outside this alignment; each is a small change for the next patch release): **F10 (Low, DEFERRED)**
  `node-ci.yml` never runs the unit tests, so the release gate does not either; **F11 (Info, DEFERRED)**
  `qt.css:172` draws `--warning` as text (2.0:1 on the light canvas, design-tokens audit F10) in a rule no
  component here uses; **F12 (Info, DEFERRED)** the package declares 0BSD but ships no `LICENSE` file.
- Accepted or maintainer items: **F13** blanket `connect-src https:`, **F14** the npm job's gate is a
  subset of CI, **F15** the cosign identity pins the repository not the workflow (all ACCEPTED-RISK),
  **F16** registry mirror and credential inventory (DEFERRED, maintainer); **F8** records that the
  balance and epoch reads are made directly through the core client (ADJUDICATED).

The severity ceiling stays Low.

## Threat model / trust boundaries

| Actor | Holds / proves | Can do | Bounded by |
| --- | --- | --- | --- |
| Viewer | nothing | read | no signing path (I1) |
| Anyone on-chain | gate names, event fields | publish crafted strings | text interpolation; links through `ExplorerLink` (`safeHref`) |
| Full node / indexer | objects, events, balances | lie, omit, go down | display only; exact types; indexer display-only with full-node fallback (https only, size-bounded, redirects refused, timeout — in access-gate-client) |
| Static host / CDN | headers and served bytes | modify or strip them | digest-pinned image, CSP and HSTS from static-server (B.VUE-1) |
| Whoever controls the build environment | `VITE_NETWORK`, `VITE_INDEXER_URL` | point the console at another network or indexer | public values; no id or test switch; the indexer is display data (I1, F13) |
| Embedding host (dashboard) | the page around `TreasuryView`, the shared wallet | switch network under the view | network watcher resets every composable (I4); the view injects its own scoped CSS only |
| Base-image publisher, registry, CI publish job | image layers, what is signed | ship altered bytes | digest pinning, Trivy before cosign, keyless signature, SBOM and provenance (B.2, F9) |

### On-chain dependency matrix

| Object / package | ID (original-id · published-at) | Sourced from | Used as | If stale, wrong or attacker-supplied | Fails open / closed |
| --- | --- | --- | --- | --- | --- |
| `access_gate` package, testnet | `0xd7ddaa94…88c9` · same (fresh publication 2026-10-09) | `deployments` export of access-gate-client 0.0.8 | type and event filter (`originalId`) only; no call target | a look-alike package's events or objects displayed | closed: exact types; `accessGateDeployment` throws and each composable reports it |
| `PlatformConfig`, testnet | `0x3f81489d…e7b5` | same | read for the treasury address and commission | wrong treasury address shown, wrong balance read | closed on a read failure (error shown); display only |
| `AdminCap`, `Gate`, `AccessMinted`, `AccessConsumed` | defined at `originalId` | derived inside access-gate-client | owned-object and event reads | look-alike objects or events listed | closed (exact types, strict decoding in the client) |
| mainnet, localnet | none recorded | — | — | — | closed (error, no query) |

## Severity scale

Critical / High / Medium / Low / Info / Positive.

## Scope

- **In scope (0.0.17):** `src/**` (`config.ts`, `wallet.ts`, `TreasuryView.vue`, `App.vue`,
  composables, tabs, `AmountCell.vue`, `styles/qt.css`), `index.html`, `Dockerfile`, workflows,
  `.github/audit-gate.mjs`, `.github/dependabot.yml`, `scripts/third-party-licenses.mjs`, `SECURITY.md`,
  `.env.example`; the manifests in `post-bootstrap/treasury-ui/` (read-only).
- **Out of scope:** access-gate-client, wallet-adapter, ui (own audits).
- **Environment (2026-10-09):** `npm test` 12/12 (2 files, vitest 5.0.3); `vue-tsc`; stylelint, eslint,
  html-validate; production build; audit gate (1 allowlisted advisory, 0 open); `npm pack --dry-run`;
  live headers and bundle of `treasury.meddleware.co.uk`. The repository has no `CHANGELOG.md` (the
  `files` list names one); `git log` carries the release history.

## Findings

### F1 — Read-only, no XSS sinks

**Severity:** Positive — no transaction is built or signed and no component uses the wallet (the
shim exists for future signing); no `v-html`; chain strings render as text; every link is
`suiExplorerUrl(…)` through `ExplorerLink`'s `safeHref`. Re-checked 2026-10-09 (`grep` over `src/`): no
`v-html`, `innerHTML`, `eval` or `fetch`; `useWallet` is defined in `src/wallet.ts` and called by no
component.

### F2 — Ids and network from the shared sources

**Severity:** Positive — the network is wallet-adapter's shared selector (the standalone build sets
`VITE_NETWORK` once); ids come from the recorded deployment; with none, every access_gate composable
reports it instead of querying. `VITE_*` values are public (network, indexer, docs links).
Re-verified 2026-10-09: the live bundle carries exactly `access_gate` `0xd7ddaa94…88c9` and PlatformConfig
`0x3f81489d…e7b5` (the republished package; no superseded id).

### F3 — Treasury balance left out the address balance

**Severity:** Low   **Disposition:** RESOLVED (0.0.10)
**Where:** `src/composables/useTreasury.ts`
**Issue / impact:** the balance came from `coinBalance` (coin objects only); SUI sent to the treasury
with `send_funds` sits in its address balance and was not shown, so the accounting view
under-reported holdings.
**Remediation / evidence:** reads `balance.balance` (coins plus address balance, per the gRPC
`Balance` definition). Test "counts coin objects and the address balance". Same fix as dao-ui F7.
Commit `bf2e970`; re-read 2026-10-09: `useTreasury.ts` unchanged.

### F4 — Stale treasury and epoch reads

**Severity:** Low   **Disposition:** RESOLVED (0.0.10)
**Where:** `src/composables/useTreasury.ts`, `src/composables/useEpoch.ts`
**Issue / impact:** no generation guard: an older read resolving last overwrote the newer network's
value, and a failed read left the previous address's balance displayed.
**Remediation / evidence:** `latest()` guards both; the balance clears on an unknown address and on
failure. Tests for ordering and clearing ("keeps the newest address when an older read resolves last",
"clears while the address is unknown, and on a failed read"). Every composable also resets on a network
change (`onChainContext`). Commit `bf2e970`; re-read 2026-10-09.

### F5 — `SECURITY.md` described dao-ui

**Severity:** Info   **Disposition:** RESOLVED (0.0.10) — the scope now names `TreasuryView` and this
app's composables, and drops proposals.

### F6 — Supply chain and local env files

**Severity:** Low   **Disposition:** RESOLVED (0.0.10) — `npm ci` everywhere; the audit gate (TS lens
B.TS-3) in CI (`node-ci.yml`, which the image release now calls, F9) and the npm publish workflow;
`.env*` ignored except `.env.example`. Re-run 2026-10-09: `audit-gate.mjs` reports 1 high/critical
advisory (GHSA-vfj7-8cjw-p6xm, allowlisted to 2027-01-01, dev tooling only), 0 not allowlisted.

### F7 — Treasury addresses were truncated

**Severity:** Low   **Disposition:** RESOLVED (0.0.13, `d52e819`)
**Where:** `src/tabs/OverviewTab.vue`, `src/tabs/AccountsTab.vue`
**Issue:** the treasury address (where the platform commission lands) was shown truncated.
**Impact:** a truncated address is the form address-poisoning look-alikes imitate; the console is the
place an operator would check the commission recipient.
**Remediation / evidence:** both tabs render the treasury address in full (`:truncate="false"` on
`CopyableAddress` and `ExplorerLink`) with a copy control and an explorer link through `safeHref`. Event
actors in the Activity tab and gate object ids stay truncated with the full value on the link; they
are log entries, not recipients.

### F8 — Balance and epoch are read directly through the core client

**Severity:** Info   **Disposition:** ADJUDICATED
**Where:** `src/composables/useTreasury.ts` (`core.getBalance`), `src/composables/useEpoch.ts` (`getCurrentSystemState`)
**Issue:** ADR-0001 keeps typed Move-object and event reads in the domain client. These two calls read
framework state (a SUI balance, the epoch), which no domain client owns.
**Impact:** none for layering in practice: they build no transaction, decode no Move object and use no
package id; the `suiBoundary` lint passes (lint clean 2026-10-09). The balance is a display figure
(F3), the epoch feeds the status bar only.
**Remediation / evidence:** decided: generic framework reads stay in the app; a failed epoch read is
non-fatal and commented as such (`useEpoch.ts`), the balance read clears and shows its error (F4).

### F9 — Image release gate, scan, notices and runtime user

**Severity:** Low   **Disposition:** RESOLVED (0.0.16 `7a451b9`, 0.0.17 `9df71b7`)
**Where:** `.github/workflows/docker-publish.yml`, `Dockerfile`, `scripts/third-party-licenses.mjs`, `post-bootstrap/treasury-ui/base/deployment.yaml`
**Issue:** the image release was gated by a subset of CI (audit, type-check, unit tests), the published
image was not scanned before signing, the lockfile was not in the image (the SBOM saw only the base), no
third-party licence texts were served with the bundled npm code, and the runtime user was only
inherited from the base.
**Impact:** a tag could ship what CI would have refused; an SBOM that misses the bundled dependencies;
redistributed MIT/Apache code without its notices.
**Remediation / evidence:** `verify` calls `node-ci.yml` (`workflow_call`) and every build job `needs`
it (it lacks the unit tests, F10); the merge-and-sign job builds per architecture, merges the manifest,
runs Trivy on the merged digest (CRITICAL/HIGH, fixable only, `exit-code: 1`) before `cosign sign`, then
an SPDX SBOM attestation and build provenance for quay.io and Docker Hub, with no `continue-on-error`
on the public path; the Dockerfile runs `npm run licenses` in the build stage and copies
`package-lock.json` to `/usr/share/doc/treasury-ui/`; `/THIRD_PARTY_LICENSES` returns HTTP 200 on the
live site (2026-10-09) and CI runs `check:licenses`; the runtime base is static-server 0.1.7 (Go 1.26.9)
with an explicit `USER 65534:65534`; the pod sets `automountServiceAccountToken: false`, `runAsNonRoot`
uid 65534, read-only root, all capabilities dropped, `RuntimeDefault` seccomp, probes and limits; the
digest is identical in `config/images.yaml` and the overlay; all images cosign-verified 2026-10-09
(`verify-digests.sh`, 16/16). Not run: a Trivy *config* scan of the Dockerfile and manifests (the image
scan runs at release).

### F10 — Unit tests are not run by CI or by the release gate

**Severity:** Low   **Disposition:** DEFERRED (next patch release; add one step to `node-ci.yml`)
**Where:** `.github/workflows/node-ci.yml` (no `npm test` step); `docker-publish.yml` `verify` calls it
**Issue:** CI runs the audit gate, type-check, the three linters, the build and the licence check, but not
the 12 unit tests. Only the npm job's `verify` runs `npm test`. The image release's own `verify` job did
run `npm test` until 0.0.17 (`9df71b7`), which replaced it with a call to `node-ci.yml` (F9) and so
dropped the tests from the image gate; the comment in `docker-publish.yml` ("type-check, lint, tests,
build, licences") is wrong. TS lens: every test project that exists runs in CI.
**Impact:** a regression in the composables (stale-read guards, total balance, exact-type activity)
could merge and be released as an image without any gate failing; the npm job would still catch it for
the library.
**Remediation / evidence:** add `- run: npm test` to `node-ci.yml` (as walrus-ui, token-deployer-ui and
ui do); verified by reading both workflows 2026-10-09 and running the suite locally (12/12 pass, so
adding the step turns nothing red).

### F11 — `--warning` drawn as text in an unused rule

**Severity:** Info   **Disposition:** DEFERRED (next patch release; delete the rule or use `--warning-text`)
**Where:** `src/styles/qt.css:167-175` (`.dao-notice { border/color: var(--warning); background: color-mix(… var(--warning) 10% …) }`)
**Issue:** `--warning` is the bright yellow fill (2.0:1 on the light canvas). The rule draws it as text
(design-tokens audit F2, F10; dao-ui has the same rule). `grep` finds no use of `.dao-notice` in this
repo's `src/`, so the defect is latent: no shipped treasury screen shows it. The shared stylesheet is
exported with `TreasuryView`, so a host or a later screen using the class would inherit it.
**Impact:** none today; a future warning notice would be hard to read in the light theme (VUE lens
*Colour & links*, WCAG AA 4.5:1). design-tokens 0.1.9 (installed) provides `--warning-text`.
**Remediation / evidence:** remove the unused rule, or switch the text colour to `var(--warning-text)`.
Browser contrast of this app's own screens is not checked per theme and season (the ui gallery axe gate
covers the shared components only).

### F12 — No `LICENSE` file although the package declares 0BSD

**Severity:** Info   **Disposition:** DEFERRED (next patch release; add the file)
**Where:** repository root; `package.json` (`"license": "0BSD"`); `npm pack --dry-run` 2026-10-09
**Issue:** the repository has no `LICENSE` file, so the published tarball carries only the SPDX id.
access-gate-ui, seal-ui, walrus-ui and token-deployer-ui ship one. (dao-ui lacks it too.)
**Impact:** documentation and tooling only: licence scanners and consumers read the file; 0BSD asks for
no attribution, and the image serves the bundled dependencies' notices (F9).
**Remediation / evidence:** add the 0BSD text (as in the sibling repositories); `files` then picks it up
automatically.

### F13 — `connect-src` allows any https origin

**Severity:** Info   **Disposition:** ACCEPTED-RISK
**Where:** `Dockerfile` (`CSP` argument); live header read 2026-10-09
**Issue:** `connect-src 'self' https:` and `img-src 'self' data: blob: https:` are blanket allowances.
**Impact:** an injected script could send data to any https host. Script injection is the prerequisite,
and `script-src 'self' 'nonce-…'` with no inline script and no XSS sink (I3) is the control on that; the
console holds no key, no session and no private data (read-only).
**Remediation / evidence:** accepted: the full-node gRPC endpoint (wallet-adapter's per-network URL) and the
optional indexer (`VITE_INDEXER_URL`) are operator-configured per network, and enumerating them would
break white-label builds. Revisit when the hosts are fixed for mainnet.

### F14 — The npm publish gate is a subset of CI

**Severity:** Low   **Disposition:** ACCEPTED-RISK
**Where:** `.github/workflows/npm-publish.yml`
**Issue:** the npm job's `verify` runs `npm ci`, the audit gate, type-check and the unit tests, not the
full CI workflow (linters, licence check). The image release (F9) does run the full workflow on the
same tag.
**Impact:** a tag could publish the source package while the image job refuses the same commit. The
package is source only (`npm pack --dry-run` 2026-10-09: `src`, `index.html`, `vite.config.ts`,
`tsconfig.json`, README; no tests, fixtures or `.env*`).
**Remediation / evidence:** accepted: a source mirror for the dashboard, OIDC-published with provenance,
tag == version checked, idempotent, and gated on the `NPM_PUBLISH` variable. Calling `node-ci.yml` from
`npm-publish.yml` would close it; not required for safety.

### F15 — The cosign identity pins the repository, not the workflow

**Severity:** Info   **Disposition:** ACCEPTED-RISK
**Where:** `bootstrap/images/verify-digests.sh` (workspace); this repository publishes no verify command
**Issue:** the cluster check accepts any workflow identity of `github.com/meddleware-org/treasury-ui`.
**Impact:** a workflow added by someone with write access could sign an image the check would accept.
**Remediation / evidence:** the repository is the signing boundary; anchoring to
`docker-publish.yml@refs/tags/v*` is a `COSIGN_IDENTITY_REGEXP` override in the workspace script. The
deployed digest verified 2026-10-09 (16/16).

### F16 — Self-hosted registry mirror and registry credentials

**Severity:** Info   **Disposition:** DEFERRED (maintainer; `OPERATOR_TASKS.md` "Image registry credentials — record scope and rotation")
**Where:** `docker-publish.yml` `*-docker-*-private` jobs (`continue-on-error: true`); `QUAY_TOKEN`, `DOCKERHUB_TOKEN`
**Issue:** the mirror jobs fail without registry credentials and never sign; the quay.io and Docker Hub
tokens are long-lived and not yet inventoried.
**Impact:** the mirror may lag; a leaked token could push an unsigned tag (the cluster pins digests and
verifies signatures, so it would not run).
**Remediation / evidence:** the mirror is listed as best-effort; the public jobs have no
`continue-on-error`. The credential inventory (scope, holder, expiry, rotation) is the maintainer item.

## Section A — Invariant verification matrix

| # | Invariant | Enforced at | Proven by | Status |
| --- | --- | --- | --- | --- |
| I1 | Nothing is signed | no builder imports; wallet unused by components; `suiBoundary` lint | source; lint clean 2026-10-09 | HOLDS (F1) |
| I2 | Ids only from the recorded deployment; unknown network fails closed | `config.ts` `requireDeployment` | composable tests ("surfaces a missing deployment as an error"); live bundle read 2026-10-09 (only `0xd7ddaa94…`, `0x3f81489d…`) | HOLDS (F2) |
| I3 | Chain strings inert; links through helpers | no `v-html`; `ExplorerLink` | `explorer-url.test.ts` | HOLDS |
| I4 | A slower, older read never overwrites a newer one | `latest()` in every composable; reset on network change | composable tests | HOLDS (F4) |
| I5 | Treasury balance is the total | `useTreasury` | composable tests | HOLDS (F3) |
| I6 | Activity reads are bounded | ten calls of at most 100 events | source | HOLDS (code-only) |
| I7 | Look-alike packages cannot feed the console | exact types at `originalId` in access-gate-client | composable tests ("drops events of a look-alike package", "refuses an object that is not this package's PlatformConfig") | HOLDS |
| I8 | The commission recipient is shown in full | `OverviewTab`, `AccountsTab` (`:truncate="false"`) | source | HOLDS (code-only) — F7 |
| I9 | The unit tests run on every change and every release | none (`node-ci.yml` has no test step) | none | GAP — see F10 |

### Lens categories

| Lens | Category | Status |
| --- | --- | --- |
| SUI_CLIENT | Package-ID split | HOLDS — reads use `originalId` (types and events); the app has no call target |
| SUI_CLIENT | Read parsing and events | through access-gate-client — full normalised types, strict decoding, cursor paging, indexer https-only and size-bounded with full-node fallback |
| SUI_CLIENT | Network / chain binding | HOLDS (F2) — wallet-adapter's shared selector selects ids and client; the standalone build sets `VITE_NETWORK` once (testnet or mainnet); no signing, so no wallet chain |
| SUI_CLIENT | Value encoding | HOLDS — balance and prices stay `bigint`; `Number()` only inside display formatters (`AmountCell`, `AccountsTab`); addresses are shown from parsed objects |
| SUI_CLIENT | Execution result, funds in the PTB, capabilities, signature verification, dry-run, client-side publish | N/A — nothing is built, signed or executed |
| SUI_CLIENT | Chain-access layering | HOLDS — typed reads through access-gate-client; balance and epoch are generic framework reads (F8); `suiBoundary` lint |
| TS | Compiler strictness | HOLDS — `strict: true`, `vue-tsc --noEmit` in CI; `noUncheckedIndexedAccess` is not enabled (the app parses no untrusted data itself); `skipLibCheck: true` hides nothing in `src/` |
| TS | Assertions, validation, money, network I/O, dynamic code | HOLDS — no `any`, `!`, `eval` or `fetch` in `src/`; the one cast is `activeTab as keyof …` over a fixed tab map; the app makes no network call of its own |
| TS | Promise handling | HOLDS — the only empty `catch` (`useEpoch`) is commented and non-security (status bar shows "Epoch —") |
| TS | Strictness, exports, `files`, supply chain | HOLDS (F6) — `files` whitelist (`npm pack --dry-run` clean); `npm ci`; audit gate; the unit tests are not run in CI (F10); no `LICENSE` file (F12) |
| VUE | Untrusted rendering | HOLDS (I3) |
| VUE | Colour & links | GAP (latent) — `--warning` as text in an unused rule (F11) |
| VUE | Build-time configuration | HOLDS — every variable in `.env.example`; defaults match the Dockerfile and README |
| VUE | Test hooks | N/A — none; no test mode exists |
| VUE | Signing UX | N/A — nothing is signed |
| VUE | Shared-wallet state | N/A — the wallet is not used; network switches reset every composable (I4) |
| VUE | Browser storage | N/A — none used |
| VUE | Lazy boundaries | N/A — no heavy SDK or wasm |
| VUE | Dual app / library | HOLDS — `TreasuryView` imports its own scoped `qt.css` and has no shell chrome |
| VUE | Estimates | HOLDS — amounts are read from the chain; the 4-digit display rounding is a formatter, not an estimate |
| IMG | Base images, build context, reproducible build, no secrets, runtime user, scan, SBOM and notices | HOLDS (F9) — digest-pinned `node:24-slim` and static-server 0.1.7; `.dockerignore` excludes `node_modules`, `dist`, `.git`, `.github`, `.env*.local`; `npm ci`; no secret in any `ARG`/`ENV`; Trivy before cosign; lockfile in the image; `/THIRD_PARTY_LICENSES` served |
| IMG | Verification command | GAP accepted — the identity pins the repository (F15) |
| IMG | Deployment pinning | HOLDS — digest in `config/images.yaml` and the overlay; the base manifest's tag label (`0.1.0`) is overridden by the overlay digest and is cosmetic |

## Section B — Supply-chain, publish-authority & capability matrix

### B.1 Dependency & CVE risk

| Dependency | Pinned version | Liveness dependency? | CVE / audit status | Notes |
| --- | --- | --- | --- | --- |
| `@meddleware/access-gate-client` | `^0.0.8` (installed 0.0.8) | every read | clean 2026-10-09 | latest |
| `@meddleware/wallet-adapter` | peer `>=0.0.12 <0.2.0`; dev `^0.0.17` | client | own audit | host's copy |
| `@meddleware/ui` / `design-tokens` / `eslint-config` | `^0.1.31` / `^0.1.9` / `^0.0.2` | UI | own audits | latest published |
| `@mysten/sui` | `^2.33.2` (installed 2.35.0) | reads | `npm audit` gate 2026-10-09: only the allowlisted advisory | one copy (`npm ls`); ADR-0001 baseline `^2.33.1` |
| Vue / Vite / TypeScript / vitest | 3.5.43 / 8.3 / 6.0.3 / 5.0.3 (plugin-vue 6.0.9, vue-tsc 3.3.x) | build | clean | TypeScript 7 and vitest 5-major follow-ups declined (decision); Node 24 LTS |
| Sui full node | public gRPC (wallet-adapter) | every panel | Mysten | fails closed (each panel shows its error) |
| Read-indexer (`sui-indexer.meddleware.co.uk`) | https, optional `VITE_INDEXER_URL` | activity feed | own audit | display data; falls back to the full node after 3 s |
| `static-server` / `node:24-slim` | 0.1.7 / digest-pinned | runtime / build | Trivy at release (F9); Go 1.26.9 | — |
| dev tooling | lockfile | no | GHSA-vfj7-8cjw-p6xm allowlisted to 2027-01-01 | TS lens B.TS-3 |

Shared-dependency matrix (TS lens): `@mysten/sui` dep `^2.33.2` (baseline `^2.33.1`, within range);
`vue` dep `^3.5.43`; `typescript` dev `~6.0.0`; `vitest` dev `~5.0.2`; `@mysten/wallet-standard`,
`@mysten/walrus`, `@mysten/walrus-wasm`, `@mysten/seal`, `@mysten/bcs`: not used. First-party ranges
are `^0.0.x` (exact) or `^0.1.x` (ui, which resolves to the latest published); no `~0.0.x`; the
wallet-adapter peer range is `>=0.0.12 <0.2.0`, no `legacy-peer-deps`.

Install-time code (TS B.TS-2): the lockfile has one lifecycle script, `fsevents` 2.3.3 (dev, optional,
macOS only); no `allowScripts`, no `overrides`; no `prepare`/`postinstall` in `package.json`. `files`:
`src`, `index.html`, `vite.config.ts`, `tsconfig.json` (and a `CHANGELOG.md` entry that matches no file).

### B.2 Publish authority, capabilities & secret custody

| Authority / secret | Where held | Custody | Gates | Rotation |
| --- | --- | --- | --- | --- |
| npm publish | GitHub Actions | OIDC + provenance; opt-in `NPM_PUBLISH` | library | n/a |
| `QUAY_TOKEN`, `DOCKERHUB_TOKEN` | GitHub secrets | long-lived robot accounts (inventory: `OPERATOR_TASKS.md`) | image push | F16 |
| image signing | GitHub Actions | cosign keyless | images | n/a |

The app holds no key and no capability.

CI & release integrity: actions pinned by SHA (workflows read 2026-10-09); explicit `permissions:` per
workflow and job (`id-token`/`attestations` only on the merge-and-sign job, `id-token` only on the npm
publish job); OIDC publish with a tag == version check and an idempotent registry check; npm client
pinned (`npm@11.20.0`); image release = full CI via `workflow_call` + Trivy + cosign + SPDX SBOM
attestation + provenance, multi-arch signed at the merged index digest, no `continue-on-error` on the
public path (F9; the CI workflow lacks the tests, F10; the npm gate is a subset, F14); `npm ci`
everywhere; audit gate in CI and the npm job; Dependabot weekly and grouped for npm, Docker and Actions
(`.github/dependabot.yml`); no test-only build mode exists, so there is nothing to scan for; no job
spends real funds.

### B.VUE-1 Hosting headers

Live headers on `treasury.meddleware.co.uk`, read 2026-10-09: `Content-Security-Policy` (`default-src
'self'`, `script-src 'self' 'nonce-…'`, `style-src 'self' 'unsafe-inline'`, `connect-src 'self' https:`,
`img-src 'self' data: blob: https:`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`,
`frame-ancestors 'self'`, `upgrade-insecure-requests`), `Strict-Transport-Security` (1 year,
includeSubDomains), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy`, `X-Frame-Options: SAMEORIGIN`. The CSP is static-server's
(`CONTENT_SECURITY_POLICY` from the `CSP` build argument); there is no static host and no `_headers`
file. `'unsafe-inline'` is for styles only; the build emits no inline script. The blanket `https:` in
`connect-src` and `img-src` is F13. Framing is `'self'` only; the dashboard embeds the view as a
component, not a frame.

### B.VUE-2 Build inputs and artifacts / IMG

`node:24-slim@sha256:0e0ff40c…` builder and `static-server:0.1.7@sha256:2e227311…` runtime, both
digest-pinned (Dependabot Docker group); `npm ci`; `.dockerignore` excludes local installs, build output,
VCS data and every `.env*.local`; `npm run build && npm run licenses` run in the build stage; the runtime
stage copies `dist` and the lockfile only; `USER 65534:65534`; no secret in any `ARG`/`ENV` (the build
args are the public `VITE_NETWORK` and `VITE_INDEXER_URL` values and the CSP); production sourcemaps are
not emitted (Vite default); the deployment is read-only root, `runAsNonRoot` uid 65534, no privilege
escalation, all capabilities dropped, `RuntimeDefault` seccomp, `automountServiceAccountToken: false`,
readiness and liveness probes on `/`, requests 5m/16Mi and limits 100m/48Mi; digest `sha256:8e155ce3…`
in both `config/images.yaml` and the overlay; cosign signature verified 2026-10-09 (F15). Not run: a
Trivy *config* scan of the Dockerfile and manifests (F9).

### B.SC-1 ID-constant trace

| Location | Network | Value | original-id or published-at | Matches the latest on-chain version |
| --- | --- | --- | --- | --- |
| access-gate-client 0.0.8 `deployments` (resolved from npm at build; the only source) | testnet | `access_gate` `0xd7ddaa94…88c9` | both (fresh publication 2026-10-09); the app uses `originalId` only | Y — access-gate-sui commit `7906954`; live bundle read 2026-10-09 |
| same | testnet | PlatformConfig `0x3f81489d…e7b5` | n/a (shared object) | Y — same bundle read |
| any `VITE_*`, `src/` literal, `.env.example` | any | none | — | Y — grep finds no 0x id in `src/` |
| mainnet, localnet | — | none recorded | — | n/a — `accessGateDeployment` throws; each composable reports it |

### B.SC-2 Coupling table

| Move function / event | Reader (access-gate-client) | Test asserting type and fields |
| --- | --- | --- |
| `PlatformConfig` object | `fetchPlatformConfig` | `composables.test.ts` (recorded id; foreign object refused); client tests and weekly schema-drift suite |
| `AdminCap` / `Gate` objects | `fetchAdminCaps`, `fetchGate` | `composables.test.ts` (paging; unreadable gate left out); client tests |
| `AccessMinted` / `AccessConsumed` events | `listAccessGateEvents` | `composables.test.ts` (consumer vs recipient, look-alike package dropped, paging); client strict-decode tests |

## Section C — Test-coverage & hermetic/live split

### C.1 Coverage grade — B (12/12, 2026-10-09)

Vitest 5.0.3, 2 files: `composables.test.ts` (activity, platform config, gates, treasury balance) and
`explorer-url.test.ts`. Activity merge and decoding through the real client, gate discovery and its
failure paths, platform config, explorer links, and the treasury balance (total, ordering, clearing).
No component tests (the tabs hold formatting only) and no Playwright suite. Gating variables: none; the
suite is hermetic. The suite is not run by `node-ci.yml` or by the image release (F10); the npm job
runs it.

### C.2 Hermetic vs. live paths

| Path | Hermetic? | Deferred to | Tracking |
| --- | --- | --- | --- |
| Composables over a mocked core client | yes | — | `npm test` |
| Live reads | no | testnet | access-gate-client `GRPC_TESTNET` read and drift suites (PASS 2026-10-09 against the new package); live bundle and headers read 2026-10-09 |
| Browser contrast (axe) of this app's own screens | no | `@meddleware/ui` gallery covers shared components only | F11 |

## Section D — Deployment-readiness gates

### pre-localnet

- [x] builds; type-check, three linters, unit tests green (2026-10-09); no secrets in source
- [x] no `v-html`; every dynamic link through `ExplorerLink`/`safeHref`; no secret `VITE_*`
- [x] `VITE_*` inventory complete and matching `.env.example`

### pre-testnet

- [x] deployed with digest pinning; CSP and HSTS verified live 2026-10-09
- [x] `SECURITY.md` present and accurate (F5)
- [x] image: digest-pinned bases, non-root, restricted pod, probes and limits, deployed by digest, signed with SBOM and provenance, scanned before signing (F9)
- [x] consumed IDs are the latest on-chain version — live bundle carries `0xd7ddaa94…` and `0x3f81489d…` only (B.SC-1)
- [ ] every test project runs in CI — F10 (next patch)
- [ ] colour: no warning text below AA on the light theme — F11 (latent, next patch)

### pre-mainnet

- [ ] `access_gate` mainnet deployment recorded in access-gate-client, then a release — mainnet-blocked
- [x] CSP and HSTS on the one hosting path (B.VUE-1)
- [ ] registry credential inventory and rotation (F16) — `OPERATOR_TASKS.md` "Image registry credentials"
- [ ] re-review if signing is ever added — standing condition
- [ ] external review — maintainer item (`OPERATOR_TASKS.md` "Funding, grants and an external audit")

## Cross-project themes

- **Supply chain & release integrity** — lockfile (also shipped in the image); first-party libraries at
  their latest versions; signed images with SBOM and provenance, Trivy before signing, SHA-pinned
  actions, grouped Dependabot; expiring audit allowlist; publish authority in B.2.
- **Wire-format coupling** — none here: events and objects are decoded in access-gate-client.
- **On-chain-truth boundary** — read-only; amounts are formatted for display only.
- **Deployment readiness** — Section D.
- **Chain-access layering** — typed reads through access-gate-client; the balance and epoch reads are the
  only direct core calls (F8); the `suiBoundary` lint enforces the rest. IDs consumed: B.SC-1.

## Normative requirements (MUST / MUST NOT)

- **SC-M1–SC-M10** — hold through access-gate-client (SC-M3, SC-M6 to SC-M9 are N/A: nothing is signed
  or executed). SC-M1: reads use `originalId` from the recorded deployment. SC-M5: network, ids and
  client follow one selector; missing ids fail closed.
- **TS-M1–TS-M9** — hold. TS-M9: `@mysten/sui` is a single copy; wallet-adapter is a peer. The lens's
  Section C rule that every test project runs in CI is not met (F10).
- **VUE-M1–VUE-M9** — hold (VUE-M3, M4, M5, M6, M7 N/A: no test hooks, signing, wallet state or
  storage); the *Colour & links* category has one latent defect (F11).
- **IMG-M1–IMG-M8** — hold; IMG-M8's verification command pins the repository only (F15).

## Implementation suggestions (SHOULD / MAY)

- MAY format amounts with exact bigint arithmetic (`AmountCell`, `AccountsTab` round
  `Number(mist) / 1e9` to 4 decimals — display only, imprecise above 2^53 MIST).
- SHOULD remove the unused `useWallet` shim from `src/wallet.ts` (it requests the
  `sui:signPersonalMessage` feature, which suggests a signing path that does not exist).
- MAY add component tests for the three tabs (formatting and empty states).
- MAY run a Trivy configuration scan of the Dockerfile and manifests in CI.

## Open questions (`OQ#`)

None.

## Risks

- **Full-node and indexer liveness** — panels show their own errors when reads fail.
- **Registry tokens** — long-lived robot tokens for image pushes (F16).
- **Third-party UI packages** — the console trusts ui, wallet-adapter and access-gate-client at the
  versions the lockfile pins; their audits are separate.

## Re-verification log

- 2026-09-30 — B3: reads, events and ids through access-gate-client; `.env.example` added (no audit
  yet).
- 2026-10-03 — first full pass under AUDIT_TEMPLATE.md + SUI_CLIENT + TS + VUE + IMG (Phase 7). F3–F6
  RESOLVED in 0.0.10 (with access-gate-client 0.0.4 and wallet-adapter dev 0.0.13). Counts: 12/12.
- 2026-10-03 — 0.0.11: the footer's docs and dev links pointed at pages that do not exist (`/treasury/` on both sites); they now open the new Treasury docs section and the Access Gate developer guide (docs audit F12). Deployed; live sweep clean.
- 2026-10-08 — Lens dates reconciled with the registry (`check-template-dates.mjs`): base 2026-10-08, and SUI_CLIENT/GO 2026-10-08 and TS 2026-10-03 where cited. The changes (AUTH/PLATFORM/MCP/DB registered, the GO token row moved to AUTH, JSR in trusted publishing, layered injection guards) alter no disposition here.
- 2026-10-09 — re-verified against 0.0.17 (releases 0.0.12 to 0.0.17): every finding re-checked against the
  code, tests, workflows, manifests and the live site. Template dates now cite the registry (VUE, TS, IMG
  2026-10-08), with the new VUE *Colour & links* category and the IMG extensions applied. Front matter
  gained the lens fields (build tool, hosting, VITE_* inventory, images, base images, runtime user) and a
  current deployment status (0.0.17, `sha256:8e155ce3…`, access_gate `0xd7ddaa94…`). F1 to F6 re-confirmed
  (F2 evidence: live bundle ids). New: F7 (treasury address in full, RESOLVED 0.0.13), F8 (direct
  balance and epoch reads, ADJUDICATED), F9 (release gate, Trivy, lockfile, notices, `USER 65534`,
  RESOLVED 0.0.16–0.0.17), F10 (unit tests not run in CI or the release gate since `9df71b7`,
  DEFERRED), F11 (`--warning` as text in an unused rule, DEFERRED; design-tokens F10), F12 (no
  `LICENSE` file, DEFERRED), F13 (blanket `connect-src`, ACCEPTED-RISK), F14 (npm gate subset,
  ACCEPTED-RISK), F15 (cosign identity, ACCEPTED-RISK), F16 (registry credentials, DEFERRED
  maintainer). Section A gained I7 to I9 and the lens categories; B.SC-1, B.SC-2 and the shared-dependency
  matrix added; D gates updated. Counts: 16 findings — 6 RESOLVED (F3–F7, F9), 2 Positive (F1, F2),
  1 ADJUDICATED (F8), 3 ACCEPTED-RISK (F13–F15), 4 DEFERRED (F10–F12 next patch; F16 maintainer);
  tests 12/12, `vue-tsc`, three linters and the audit gate green.
