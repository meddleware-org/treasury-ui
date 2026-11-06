import { definePlaywrightConfig } from '@meddleware/frontend-config/playwright'

// Browser tests of the BUILT app in its e2e mode (`vite preview` of dist: a stub chain with data; `?chain=down` leaves the real client, whose reads fail): Chromium locally, all five browser projects in CI (E2E_BROWSERS=all to run
// them locally). Every request that leaves localhost is refused in the specs, so runs need no network. The screenshot capture
// (`npm run shots`) is for looking, not asserting.
export default definePlaywrightConfig({ port: 4287, command: 'npm run build:e2e && npx vite preview --port 4287 --strictPort' })
