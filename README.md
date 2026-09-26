# @meddleware/treasury-ui

The **Meddleware Treasury console** — a standalone Vue 3 SPA (and embeddable library) presenting the
organisation's treasury as an accounting view over its revenue streams. Today that is the on-chain
(Sui) platform commission collected on `access_gate` NFT purchases; the UI is structured so further
streams can be added later.

Served at **`treasury.meddleware.co.uk`** and embedded in the Meddleware dashboard.

## Tabs

- **Overview** — treasury balance, commission rate, and a recent-activity snapshot.
- **Accounts** — the Sui treasury account (address, balance, commission) and its revenue sources
  (community access gates). Structured as a list of accounts so more streams can join.
- **Activity** — the paginated on-chain revenue-event log (access sold / used / burned).

It is read-only: all figures come from Sui via a bare `SuiClient`; the app never holds custody or
computes financial truth (that lives on-chain in the `access_gate` Move package).

## Develop

```bash
npm install
npm run dev         # local dev server
npm run type-check  # vue-tsc
npm test            # vitest (composable merge/filter logic)
npm run build       # type-check + vite build → dist/
```

## Dual app + library

- **Standalone SPA:** `src/main.ts` mounts `App.vue` (`AppHeader` + `TreasuryView` + `AppFooter`).
- **Library:** `src/index.ts` exports `TreasuryView` for inline embedding by the dashboard against a
  shared `@meddleware/wallet-adapter` connection. `TreasuryView` self-imports its scoped `qt.css`.

Built on `@meddleware/ui` (shared desktop-console "qt" components) and `@meddleware/design-tokens`.
