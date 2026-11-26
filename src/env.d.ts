// Type declarations for the build variables. Vite's client types give `import.meta.env`; this file narrows it to the variables treasury-ui reads (see
// .env.example for what each does). Related: src/config.ts, src/main.ts and src/App.vue read them.
/// <reference types="vite/client" />

/** The build variables this app reads; every one is optional and none is a secret. */
interface ImportMetaEnv {
  /** Standalone build only: the network main.ts selects (embedded views follow the host's selector). */
  readonly VITE_NETWORK?: string
  /** Optional read-indexer base URL (display data; reads fall back to the full node). */
  readonly VITE_INDEXER_URL?: string
  /** End-to-end build only (`npm run build:e2e`): loads src/e2e.ts (a mock wallet and a stub chain). A production build refuses it. */
  readonly VITE_E2E?: string
  // The documentation link in the shell; unset hides it.
  readonly VITE_DOCS_URL?: string
  // The developer-documentation link in the shell; unset hides it.
  readonly VITE_DEV_URL?: string
}

/** Types `import.meta.env` with the variables above. */
interface ImportMeta {
  readonly env: ImportMetaEnv
}
