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
  selector (the standalone `main.ts` selects `VITE_NETWORK`). The ids come from
  `@meddleware/access-gate-client/deployments` for that network — never env, never literals. With
  no deployment for the network, composables report an error rather than querying.
- **Shared qt components.** The desktop-console look comes from `@meddleware/ui` (UiPanel,
  UiToolbar/UiToolbarButton, UiStatusBar/UiStatusDot, UiDataTable, UiStatGrid/UiStatRow, UiBadge,
  UiActivityFeed/UiActivityItem, `AppTabNav variant="raised"` + `UiTabPanel`, `UiStatusBar` with its
  network/epoch/refresh props). Only small app-local utility classes remain in `styles/qt.css`.
- **Semantic markup, no inline styles.** Presentation lives in `qt.css` or scoped `<style>` blocks,
  never `style=""` attributes; `npm run lint:html` (html-validate) enforces this.

## Key files

| File | Purpose |
| --- | --- |
| `src/config.ts` | The active `network` (wallet-adapter selector), `explorerNetwork`, `requireDeployment()` (ids from access-gate-client `deployments`), optional `INDEXER_URL`. |
| `src/wallet.ts` | Shim over `@meddleware/wallet-adapter`; `getSuiClient()` for bare reads. |
| `src/TreasuryView.vue` | Core tool UI — tab shell (Overview / Accounts / Activity) + status bar. Self-imports `styles/qt.css`; exported from `src/index.ts`. |
| `src/index.ts` | Library entry — exports `TreasuryView`. |
| `src/App.vue` | Standalone shell only: `AppHeader` + `<TreasuryView>` + `AppFooter` (+ CopyrightLine). |
| `src/composables/usePlatformConfig.ts` | Reads `PlatformConfig` → `{ treasury, commissionBps }`. |
| `src/composables/useTreasury.ts` | Reads the treasury's SUI balance, reactive to the address getter. |
| `src/composables/useGates.ts` | `AdminCap`-ownership discovery of revenue sources (gates). |
| `src/composables/useTreasuryActivity.ts` | Merged, checkpoint-sorted revenue-event feed. |
| `src/composables/useEpoch.ts` | Current Sui epoch for the status bar (non-fatal on failure). |
| `src/tabs/OverviewTab.vue` | Treasury balance + revenue activity + recent activity. |
| `src/tabs/AccountsTab.vue` | The Sui treasury account + revenue sources (gates). |
| `src/tabs/ActivityTab.vue` | Paginated revenue-event log. |

## Dual app + library

Like `dao-ui`/`seal-ui`, this package is **both** a standalone SPA (`App.vue` + `main.ts`,
`vite build`) and a library (`src/index.ts` exports `TreasuryView`, resolved via `"exports"`). The
dashboard imports `TreasuryView` and wraps it in its own shell + shared wallet. `TreasuryView`
imports its own `qt.css`, so no consumer needs this package's global CSS.

## What NOT to do

- Do not add governance/proposals here — that is `dao-ui`.
- Do not add accounting/commission logic; it is on-chain in `access_gate`.
- Do not require a wallet for reads. Reads use a bare `SuiClient`.
- Do not hardcode Sui as the only revenue stream in the Accounts structure.
- Do not hardcode or env-configure package/object ids; take them from `requireDeployment()`.
