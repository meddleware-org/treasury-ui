// Standalone SPA bootstrap. Loads the design-token + ui base stylesheets and the
// console's qt.css, then mounts the App shell. (The library path — src/index.ts —
// bypasses this and relies on TreasuryView's own scoped qt.css import instead.)
import '@meddleware/design-tokens/tokens.css'
import '@meddleware/design-tokens/seasons.css'
import '@meddleware/ui/base.css'
import './styles/qt.css'
import { createApp } from 'vue'
import { useSeason } from '@meddleware/ui'
import { useNetwork } from '@meddleware/wallet-adapter'
import App from './App.vue'

// The standalone build targets one network; select it in the shared selector so the client, the
// ids, the explorer links and the status bar all agree. (Embedded, the host's selector rules.)
const built = import.meta.env.VITE_NETWORK || 'testnet'
if (built === 'testnet' || built === 'mainnet') useNetwork().setNetwork(built)

useSeason()
createApp(App).mount('#app')
