// Standalone SPA bootstrap. Loads the design-token and ui reset stylesheets, then mounts the App shell.
// (The library path — src/index.ts — bypasses this: the host provides them.)
// The design tokens: every colour, space and type size the components use.
import '@meddleware/design-tokens/tokens.css'
// The seasonal accent colours that `useSeason` switches between.
import '@meddleware/design-tokens/seasons.css'
// The shared reset and base styles.
import '@meddleware/ui/reset.css'
// Vue's application factory.
import { createApp } from 'vue'
// `loadRuntimeConfig` reads /runtime-config.json; `useSeason` applies the seasonal colours.
import { loadRuntimeConfig, useSeason } from '@meddleware/ui'
// Selects the network the build targets in the shared selector.
import { selectBuiltNetwork } from '@meddleware/wallet-adapter'

// The standalone build targets one network; select it in the shared selector so the client, the
// ids, the explorer links and the status bar all agree. (Embedded, the host's selector rules.)
selectBuiltNetwork(import.meta.env.VITE_NETWORK || 'testnet')

// Apply the seasonal accent colours.
useSeason()
// Machine-zone endpoints (the indexer, the Walrus relays) come from /runtime-config.json when the deployment
// serves one (ADR-0005); load it before any module that reads them is imported.
// Load the runtime configuration first; the App is imported only afterwards so modules that read it at load see the overrides.
void loadRuntimeConfig().then(async () => {
  // End-to-end builds only: a mock wallet and a stub chain with data (`src/e2e.ts`). Both conditions are static, so no other build contains it.
  if (import.meta.env.MODE === 'e2e' && import.meta.env.VITE_E2E === '1') (await import('./e2e.js')).installE2e()
  // A dynamic import, for the reason above.
  const { default: App } = await import('./App.vue')
  // Mount the application.
  createApp(App).mount('#app')
})
