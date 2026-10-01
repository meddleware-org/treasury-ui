// Gates the platform treasury administers: its AdminCaps (resilient to event pruning), each merged
// with its Gate. A gate that cannot be read is left out rather than failing the list.
import { ref } from 'vue'
import { fetchAdminCaps, fetchGate, fetchPlatformConfig } from '@meddleware/access-gate-client'
import { getSuiClient } from '../wallet.js'
import { requireDeployment } from '../config.js'
import { latest, onChainContext } from './chainContext.js'

export interface Gate {
  id: string
  name: string
  price: bigint
  paused: boolean
  frozen: boolean
}

export function useGates() {
  const gates = ref<Gate[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const begin = latest()

  async function load() {
    const current = begin()
    loading.value = true
    error.value = null
    try {
      const d = requireDeployment()
      const client = getSuiClient()
      const { treasury } = await fetchPlatformConfig(client, d.platformConfigId, d.originalId)
      const caps = await fetchAdminCaps(client, treasury, d.originalId)
      const settled = await Promise.allSettled(caps.map((c) => fetchGate(client, c.gateId, d.originalId)))
      if (!current()) return
      gates.value = settled.flatMap((r) =>
        r.status === 'fulfilled' && r.value
          ? [{ id: r.value.gateId, name: r.value.nftName || 'Unnamed Gate', price: r.value.priceMist, paused: r.value.paused, frozen: r.value.frozen }]
          : [],
      )
    } catch (e) {
      if (!current()) return
      gates.value = []
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      if (current()) loading.value = false
    }
  }

  onChainContext(load, () => (gates.value = []))

  return { gates, loading, error, reload: load }
}
