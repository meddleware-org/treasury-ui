// Chain configuration. The network is wallet-adapter's shared runtime selector — the one source for
// the client, the access_gate ids, explorer links and the status bar. The ids come from
// @meddleware/access-gate-client/deployments, generated from access-gate-sui's published records.
import { useNetwork } from '@meddleware/wallet-adapter'
import { accessGateDeployment, type AccessGateDeployment } from '@meddleware/access-gate-client/deployments'
import { withRuntimeEnv } from '@meddleware/ui'
import { NotDeployedError } from './availability.js'

/** The active network (read-only ref; the standalone build selects `VITE_NETWORK` in main.ts). */
export const network = useNetwork().network

/** The network as the explorer links know it (wallet-adapter's: a network the explorer does not serve links to testnet). */
export const explorerNetwork = useNetwork().explorerNetwork

/**
 * The access_gate deployment on the active network.
 *
 * @throws {NotDeployedError} if none is recorded for it (e.g. mainnet before launch, or localnet); the page words it as "not available on <network>".
 */
export function requireDeployment(): AccessGateDeployment {
  try {
    return accessGateDeployment(network.value)
  } catch {
    throw new NotDeployedError(network.value)
  }
}

/** Optional read-indexer (display data only; reads fall back to the full node). */
// The indexer is a machine-zone endpoint: a runtime override (/runtime-config.json, ADR-0005) wins.
export const INDEXER_URL: string = withRuntimeEnv(import.meta.env).VITE_INDEXER_URL || ''
