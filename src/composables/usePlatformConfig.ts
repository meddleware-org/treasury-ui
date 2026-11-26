// Reads the PlatformConfig shared object and exposes the treasury address + commission rate (basis points on chain, shown as a percentage).
// Source of truth for the commission model and for whose AdminCaps the gate discovery looks up. One read serves every tab.
import { computed, ref } from 'vue'
import { fetchPlatformConfig } from '@meddleware/access-gate-client'
import { createGeneration } from '@meddleware/web-utils'
import { getSuiClient } from '../wallet.js'
import { plainFailure } from '../availability.js'
import { requireDeployment } from '../config.js'
import { onChainContext, shared } from './chainContext.js'

/** The platform settings the console shows. */
export interface PlatformConfig {
  treasury: string
  commissionBps: number
}

// The platform settings once read, or null.
const config = ref<PlatformConfig | null>(null)
// True while the read is in flight.
const loading = ref(false)
// A plain sentence when the read failed, or null.
const error = ref<string | null>(null)
// Guards against a slow read for a previous network overwriting a newer one.
const generation = createGeneration()
/** The commission as a percentage for people (`0.20%`), or `—` until it is known. */
const commissionPct = computed(() => (config.value ? `${(config.value.commissionBps / 100).toFixed(2)}%` : '—'))

// One shared read serves every tab.
const loader = shared(
  async () => {
    // Start a read; `current()` says whether it is still the newest.
    const current = generation.begin()
    loading.value = true
    error.value = null
    try {
      // The recorded deployment for the active network (throws NotDeployedError where there is none).
      const d = requireDeployment()
      // The shared PlatformConfig object: who the treasury is and what commission the platform takes.
      const c = await fetchPlatformConfig(getSuiClient(), d.platformConfigId, d.originalId)
      // A newer read has begun: this answer is stale, so drop it.
      if (!current()) return false
      // Keep the two fields the console shows; the rate is a number of basis points on chain.
      config.value = { treasury: c.treasury, commissionBps: Number(c.commissionBps) }
      // Success: remembered by the loader.
      return true
    // A failure: show nothing stale and say in plain words what could not be read.
    } catch (e) {
      if (!current()) return false
      // No stale settings after a failure.
      config.value = null
      // The words for the person; the cause goes to the console.
      error.value = plainFailure('the platform settings', e)
      return false
    // The read is over, unless a newer one has begun.
    } finally {
      // Only the newest read clears the loading flag.
      if (current()) loading.value = false
    }
  },
  () => {
    // The network changed: discard any read still in flight.
    generation.invalidate()
    config.value = null
    error.value = null
  },
)

/** The platform settings with loading and error state, the commission as a percentage, and a `reload`. */
export function usePlatformConfig() {
  // Load on mount and again when the network changes.
  onChainContext(loader)
  return { config, loading, error, commissionPct, reload: () => loader.load(true) }
}
