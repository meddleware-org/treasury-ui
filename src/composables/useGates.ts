// Gates the platform treasury administers: its AdminCaps (resilient to event pruning), each merged
// with its Gate. A gate that cannot be read is left out rather than failing the list. One read serves every tab.
import { ref } from 'vue'
import { fetchAdminCaps, fetchGate, fetchPlatformConfig } from '@meddleware/access-gate-client'
import { createGeneration } from '@meddleware/web-utils'
import { getSuiClient } from '../wallet.js'
import { plainFailure } from '../availability.js'
import { requireDeployment } from '../config.js'
import { onChainContext, shared } from './chainContext.js'

/** A gate as the treasury table shows it. */
export interface Gate {
  id: string
  name: string
  price: bigint
  paused: boolean
  frozen: boolean
}

// The gates the treasury administers, once read (empty until then, and after a failure).
const gates = ref<Gate[]>([])
// True while the read is in flight.
const loading = ref(false)
// A plain sentence for the person when the read failed, or null.
const error = ref<string | null>(null)
// Guards against a slow read for a previous network overwriting a newer one.
const generation = createGeneration()

// One shared read serves every tab that asks for the gates.
const loader = shared(
  async () => {
    // Start a read; `current()` says whether it is still the newest.
    const current = generation.begin()
    loading.value = true
    error.value = null
    try {
      // The access_gate deployment recorded for the active network (throws NotDeployedError where there is none).
      const d = requireDeployment()
      const client = getSuiClient()
      // The platform's treasury address, read from the shared PlatformConfig object.
      const { treasury } = await fetchPlatformConfig(client, d.platformConfigId, d.originalId)
      // The AdminCaps the treasury owns, each naming a gate it administers; read from owned objects so event pruning does not matter.
      const caps = await fetchAdminCaps(client, treasury, d.originalId)
      // Read each gate; one that cannot be read must not fail the others, hence `allSettled`.
      const settled = await Promise.allSettled(caps.map((c) => fetchGate(client, c.gateId, d.originalId)))
      // A newer read has begun (the network changed): this answer is stale, so drop it.
      if (!current()) return false
      // Keep only the gates that were read, shaped for the table; an unnamed gate gets a placeholder name.
      gates.value = settled.flatMap((r) =>
        r.status === 'fulfilled' && r.value
          ? [{ id: r.value.gateId, name: r.value.nftName || 'Unnamed Gate', price: r.value.priceMist, paused: r.value.paused, frozen: r.value.frozen }]
          : [],
      )
      // Success: the loader remembers it and does not read again.
      return true
    // A failure: show nothing stale, and say in plain words what could not be read (the cause goes to the console).
    } catch (e) {
      if (!current()) return false
      // No stale rows after a failure.
      gates.value = []
      // The words for the person; the technical cause is logged once for the developer.
      error.value = plainFailure('the revenue sources', e)
      return false
    // Whatever happened, the read is over (unless a newer one has begun).
    } finally {
      // Only the newest read clears the loading flag.
      if (current()) loading.value = false
    }
  },
  () => {
    // The network changed: discard any read still in flight.
    generation.invalidate()
    gates.value = []
    error.value = null
  },
)

/** The treasury's gates with their loading and error state, and a `reload` that reads them again. */
export function useGates() {
  // Load on mount and again when the network changes.
  onChainContext(loader)
  return { gates, loading, error, reload: () => loader.load(true) }
}
