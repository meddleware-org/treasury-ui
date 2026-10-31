// Gates the platform treasury administers: its AdminCaps (resilient to event pruning), each merged
// with its Gate. A gate that cannot be read is left out rather than failing the list. One read serves every tab.
import { ref } from 'vue'
import { fetchAdminCaps, fetchGate, fetchPlatformConfig } from '@meddleware/access-gate-client'
import { createGeneration, errorMessage } from '@meddleware/web-utils'
import { getSuiClient } from '../wallet.js'
import { requireDeployment } from '../config.js'
import { onChainContext, shared } from './chainContext.js'

export interface Gate {
  id: string
  name: string
  price: bigint
  paused: boolean
  frozen: boolean
}

const gates = ref<Gate[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const generation = createGeneration()

const loader = shared(
  async () => {
    const current = generation.begin()
    loading.value = true
    error.value = null
    try {
      const d = requireDeployment()
      const client = getSuiClient()
      const { treasury } = await fetchPlatformConfig(client, d.platformConfigId, d.originalId)
      const caps = await fetchAdminCaps(client, treasury, d.originalId)
      const settled = await Promise.allSettled(caps.map((c) => fetchGate(client, c.gateId, d.originalId)))
      if (!current()) return false
      gates.value = settled.flatMap((r) =>
        r.status === 'fulfilled' && r.value
          ? [{ id: r.value.gateId, name: r.value.nftName || 'Unnamed Gate', price: r.value.priceMist, paused: r.value.paused, frozen: r.value.frozen }]
          : [],
      )
      return true
    } catch (e) {
      if (!current()) return false
      gates.value = []
      error.value = errorMessage(e)
      return false
    } finally {
      if (current()) loading.value = false
    }
  },
  () => {
    generation.invalidate()
    gates.value = []
    error.value = null
  },
)

export function useGates() {
  onChainContext(loader)
  return { gates, loading, error, reload: () => loader.load(true) }
}
