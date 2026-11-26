// Chain configuration. The network is wallet-adapter's shared runtime selector — the one source for
// the client, the access_gate ids, explorer links and the status bar. The ids come from
// @meddleware/access-gate-client/deployments, generated from access-gate-sui's published records.
// The shared network selector, the one source for the client, the ids and the explorer links.
import { useNetwork } from '@meddleware/wallet-adapter'
// The recorded deployments (ids per network), generated from access-gate-sui's published records.
import { accessGateDeployment, type AccessGateDeployment } from '@meddleware/access-gate-client/deployments'
// Reads a build variable, letting `/runtime-config.json` override it for machine-zone endpoints (ADR-0005).
import { withRuntimeEnv } from '@meddleware/ui'
// The error for a network with no recorded deployment.
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
  // Look the deployment up; the client throws for an unknown network.
  try {
    // The ids (package, original package, PlatformConfig) for the active network.
    return accessGateDeployment(network.value)
  // Turn the client's error into one the page words as "not available on <network>".
  } catch {
    // The network is named so the message can suggest another.
    throw new NotDeployedError(network.value)
  }
}

/**
 * Optional read-indexer (display data only; reads fall back to the full node). It is a machine-zone endpoint, so a runtime override
 * (/runtime-config.json, ADR-0005) wins over the build variable.
 */
export const INDEXER_URL: string = withRuntimeEnv(import.meta.env).VITE_INDEXER_URL || ''
