// Chain configuration. The network is wallet-adapter's shared runtime selector — the one source for
// the client, the access_gate ids, explorer links and the status bar. The ids come from
// @meddleware/access-gate-client/deployments, generated from access-gate-sui's published records.
import { computed } from 'vue'
import { useNetwork } from '@meddleware/wallet-adapter'
import { accessGateDeployment, type AccessGateDeployment } from '@meddleware/access-gate-client/deployments'
import type { SuiNetwork } from '@meddleware/ui'

/** The active network (read-only ref; the standalone build selects `VITE_NETWORK` in main.ts). */
export const network = useNetwork().network

/** SuiVision has no localnet; nothing is listed there (no deployment), so testnet links are inert. */
export const explorerNetwork = computed<SuiNetwork>(() => (network.value === 'mainnet' ? 'mainnet' : 'testnet'))

/**
 * The access_gate deployment on the active network.
 *
 * @throws {Error} if none is recorded for it (e.g. mainnet before launch, or localnet).
 */
export function requireDeployment(): AccessGateDeployment {
  return accessGateDeployment(network.value)
}

/** Optional read-indexer (display data only; reads fall back to the full node). */
export const INDEXER_URL: string = import.meta.env.VITE_INDEXER_URL || ''
