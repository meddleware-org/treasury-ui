/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Standalone build only: the network main.ts selects (embedded views follow the host's selector). */
  readonly VITE_NETWORK?: string
  /** Optional read-indexer base URL (display data; reads fall back to the full node). */
  readonly VITE_INDEXER_URL?: string
  /** End-to-end build only (`npm run build:e2e`): loads src/e2e.ts (a mock wallet and a stub chain). A production build refuses it. */
  readonly VITE_E2E?: string
  readonly VITE_DOCS_URL?: string
  readonly VITE_DEV_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
