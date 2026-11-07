# CLAUDE.md — @meddleware/treasury-ui

## What this app is

The **Meddleware Treasury console**: a Vue 3 SPA that presents the organisation's treasury as an
**accounting view over revenue streams**. Today the only stream is on-chain (Sui) — the platform
commission collected on `access_gate` NFT purchases — but the UI is deliberately structured so more
streams can be added without a rewrite. It is both a standalone SPA (`treasury.meddleware.co.uk`)
and a library whose `TreasuryView` is embedded inline in the dashboard.

It is a **sibling of `dao-ui`** built from the same desktop-console foundation, but it has **no
governance or proposals surface** — those remain in `dao-ui`. Treasury is framed as organisation
accounting; DAO is framed as governance.

## Architectural invariants

- **No on-chain logic here — extend the domain client.** `suiBoundary()` from
  `@meddleware/eslint-config` (the last entry in `eslint.config.ts`) forbids, in `src/` outside
  `src/wallet.ts`: value imports of `@mysten/sui/{grpc,client,transactions}` (type-only imports are
  fine; `@mysten/sui/jsonRpc` is banned outright), building transactions and chain reads. URL
  bindings on native elements must go through `safeHref`, `safeIcon`, `suiExplorerUrl` or
  `walruscanBlobUrl`. Do not disable it — move the logic into the domain client instead.
- **One wallet-adapter in a host.** Declare `@meddleware/wallet-adapter` as a peerDependency (`>=0.0.12 <0.2.0`, plus a devDependency):
  the host's single copy must satisfy every embedded tool, or each gets its own connection.
- **Read-only, wallet-optional.** All displayed data is read from Sui via a bare `SuiClient`; no
  wallet is required to view balances, accounts, or activity. (A wallet singleton is wired for
  future signing but nothing here needs it.)
- **On-chain truth, thin app.** No accounting or policy logic lives here. Commission math and the
  commission cap are enforced by the `access_gate` Move package; this app only reads and renders.
  Do not move financial truth into the frontend.
- **Revenue-stream framing.** The Sui treasury is presented as *one account among potentially many*.
  Keep the Accounts tab structured as a list of streams, not a Sui-only hardcode, so additional
  chains/streams slot in later.
- **Chain reads go through `@meddleware/access-gate-client`.** The composables are thin wrappers:
  exact types at the package's original id, paged owned-object reads, BCS-decoded events (a
  consume's address is its `consumer`). `useTreasuryActivity.ts` lists `AccessMinted` and
  `AccessConsumed` newest first through one module query, from the read-indexer when
  `VITE_INDEXER_URL` is set (display data; falls back to the full node). Do not parse here.
- **One network source, one id source.** The network is wallet-adapter's shared `useNetwork()`
  selector (the standalone `main.ts` selects `VITE_NETWORK` with `selectBuiltNetwork`; `explorerNetwork` is wallet-adapter's `useNetwork().explorerNetwork`). The ids come from
  `@meddleware/access-gate-client/deployments` for that network — never env, never literals. With
  no deployment for the network, composables report an error rather than querying.
- **Shared qt components.** The desktop-console look comes from `@meddleware/ui` (UiPanel, UiStatusBar,
  UiDataTable, UiStatGrid/UiStatRow, UiBadge, UiAmount, UiPager, UiFieldHint, UiLiveStatus, UiEmptyState,
  UiActivityFeed/UiActivityItem, `AppTabNav variant="raised"` + `UiTabPanel`). There is no stylesheet of
  this repo's own: layout is a few scoped rules in the components, all in design tokens.
- **One read per fact, shared by every tab.** The platform config, the gates, the epoch and the event feed are
  loaded once and shared at module level (`composables/chainContext.ts`: concurrent callers join one load, a later
  caller gets the result, a change of network clears it); the status bar and the tabs read the same feed. Amounts are
  exact (`UiAmount`, bigint digits), the commission is `commissionPct` from `usePlatformConfig`.
- **Plain words for a person, causes for the console (D117).** `src/availability.ts` owns every availability message: a network with no recorded
  `access_gate` deployment reads "The treasury is not available on <network>. Switch to <the networks that have a record>." (the records decide, never
  prose; `TreasuryView` then shows that instead of the tabs); any other failed read reads "The treasury cannot be read right now. Try again later." and
  `plainFailure` writes the technical cause to the console once. A configured read-index that cannot be used still lists events from the node and says
  "The event index is not available right now, so only recent events are listed."; the cause (`indexerError`) is logged. No page text names a `VITE_*`
  variable, a script, "operator", "ckpt"/"bps"/"PlatformConfig" or the old "MeddleWare" spelling (`tests/wording.test.ts`).
- **Semantic markup, no inline styles.** Presentation lives in scoped `<style>` blocks, never `style=""`
  attributes; `npm run lint:html` (html-validate) enforces this.

## Key files

| File | Purpose |
| --- | --- |
| `src/config.ts` | The active `network` (wallet-adapter selector), `explorerNetwork`, `requireDeployment()` (ids from access-gate-client `deployments`; throws `NotDeployedError` where none is recorded), optional `INDEXER_URL`. |
| `src/availability.ts` | The plain availability messages, `plainFailure` (message for the page, cause to the console) and the `NotDeployedError` type. |
| `src/wallet.ts` | `createToolWallet(...)` from `@meddleware/wallet-adapter`; `getSuiClient()` for bare reads. |
| `src/TreasuryView.vue` | Core tool UI — tab shell (Overview / Accounts / Activity) + status bar. A `section` with its heading; exported from `src/index.ts`. |
| `src/index.ts` | Library entry — exports `TreasuryView`. |
| `src/App.vue` | Standalone shell only: `AppToolShell` (title "Treasury", slug `treasury`; the network badge in its `actions` slot) around `<TreasuryView>`. |
| `src/composables/usePlatformConfig.ts` | Reads `PlatformConfig` → `{ treasury, commissionBps }`. |
| `src/composables/useTreasury.ts` | Reads the treasury's SUI balance, reactive to the address getter. |
| `src/composables/useGates.ts` | `AdminCap`-ownership discovery of revenue sources (gates). |
| `src/composables/useTreasuryActivity.ts` | Merged, checkpoint-sorted revenue-event feed (+ `notice` when the read-index could not be used). |
| `src/composables/useEpoch.ts` | Current Sui epoch for the status bar (non-fatal on failure). |
| `src/tabs/OverviewTab.vue` | Treasury balance + revenue activity + recent activity. |
| `src/tabs/AccountsTab.vue` | The Sui treasury account + revenue sources (gates). |
| `src/tabs/ActivityTab.vue` | Paginated revenue-event log. |

## Dual app + library

Like `dao-ui`/`sealed-storage-ui`, this package is **both** a standalone SPA (`App.vue` + `main.ts`,
`vite build`) and a library (`src/index.ts` exports `TreasuryView`, resolved via `"exports"`). The
dashboard imports `TreasuryView` and wraps it in its own shell + shared wallet. A host
provides the design tokens and the `@meddleware/ui` reset, as for every embedded tool.

## What NOT to do

- Do not add governance/proposals here — that is `dao-ui`.
- Do not add accounting/commission logic; it is on-chain in `access_gate`.
- Do not require a wallet for reads. Reads use a bare `SuiClient`.
- Do not hardcode Sui as the only revenue stream in the Accounts structure.
- Do not hardcode or env-configure package/object ids; take them from `requireDeployment()`.

## Tests and the end-to-end build

`npm test` is Vitest (composables with the real client parsing objects, the chain context, the stub data). `npm run test:e2e` builds the **e2e variant**
(`npm run build:e2e` = `VITE_E2E=1 vite build --mode e2e`) and runs the shared Playwright sweep over it: `src/e2e.ts` (loaded by `main.ts` only when the
mode is `e2e` **and** `VITE_E2E=1`) installs the mock wallet and a stub chain with data — a platform config, three gates (one with a very long name),
a large balance, an epoch and 26 events over two pages. `?chain=down` leaves the real client so the reads fail (the error states). Rules, as in the wallet
apps: `vite.config.ts` is `meddlewareApp` (`@meddleware/frontend-config/vite`), which refuses `VITE_E2E` outside the e2e mode; `npm run check:bundle` (CI and the Dockerfile) fails if a hook reached the production bundle; CI proves a
production build with `VITE_E2E=1` is refused; `!src/e2e*.ts` keeps the stub out of the tarball. If the client's parsers change, `tests/e2e-data.test.ts` fails first.

## Shared tooling

The build, test and lint plumbing comes from `@meddleware/frontend-config` (the `meddleware` section of `package.json` selects the `chain` Content-Security-Policy profile and
Lighthouse CI): `meddlewareApp` / `vueTestConfig` / the `vue-app` tsconfig base, and the bins `mw-audit-gate`, `mw-third-party-licenses` (`npm run licenses` / `check:licenses`),
`mw-check-csp-inline` (`npm run check:csp`, also a Dockerfile step) and `mw-sync` (`npx mw-sync --check` in CI keeps the Dockerfile CSP, `.dockerignore`, PostCSS/stylelint configs, Dependabot config
and the audit allowlist equal to the templates; `--write` repairs them). Do not copy those scripts back into this repository.
