// Standalone SPA bootstrap. Loads the design-token and ui reset stylesheets, then mounts the App shell.
// (The library path — src/index.ts — bypasses this: the host provides them.)
import '@meddleware/design-tokens/tokens.css'
import '@meddleware/design-tokens/seasons.css'
import '@meddleware/ui/reset.css'
import { createApp } from 'vue'
import { loadRuntimeConfig, useSeason } from '@meddleware/ui'
import { useNetwork } from '@meddleware/wallet-adapter'

// The standalone build targets one network; select it in the shared selector so the client, the
// ids, the explorer links and the status bar all agree. (Embedded, the host's selector rules.)
const built = import.meta.env.VITE_NETWORK || 'testnet'
if (built === 'testnet' || built === 'mainnet') useNetwork().setNetwork(built)

useSeason()
// Machine-zone endpoints (the indexer, the Walrus relays) come from /runtime-config.json when the deployment
// serves one (ADR-0005); load it before any module that reads them is imported.
void loadRuntimeConfig().then(async () => {
  const { default: App } = await import('./App.vue')
  createApp(App).mount('#app')
})
