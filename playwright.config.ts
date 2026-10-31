import { definePlaywrightConfig } from '@meddleware/frontend-config/playwright'

// Browser tests of the BUILT app (`vite preview` of dist): Chromium locally, all five browser projects in CI (E2E_BROWSERS=all to run
// them locally). Every request that leaves localhost is refused in the specs, so runs need no network. The screenshot capture
// (`npm run shots`) is for looking, not asserting.
export default definePlaywrightConfig({ port: 4287 })
