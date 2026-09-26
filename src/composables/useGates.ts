import { ref, onMounted, getCurrentInstance } from 'vue'
import { getSuiClient } from '../wallet.js'
import { PACKAGE_ID, CONFIG_ID } from '../config.js'

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

  async function load() {
    if (!PACKAGE_ID || !CONFIG_ID) return
    loading.value = true
    error.value = null
    try {
      const client = getSuiClient()

      // Get treasury address from PlatformConfig so we know whose AdminCaps to look for.
      // This is resilient to event pruning (the GateCreatedEvent is pruned on testnet
      // after ~3 months, making event-based discovery unreliable).
      const configRes = await client.getObject({ objectId: CONFIG_ID, include: { json: true } })
      const configFields = configRes.object?.json as Record<string, unknown> | null
      const treasury = configFields?.treasury as string | undefined
      if (!treasury) {
        gates.value = []
        return
      }

      // List AdminCap objects owned by treasury — one per gate the treasury controls.
      const { objects } = await client.listOwnedObjects({
        owner: treasury,
        type: `${PACKAGE_ID}::access_gate::AdminCap`,
        include: { json: true },
      })

      // Fetch each Gate shared object referenced by the AdminCap's gate_id.
      const gateList = await Promise.all(
        (objects ?? []).map(async (o: any): Promise<Gate | null> => {
          const capFields = o?.json ?? o?.object?.json
          const gateId = String(capFields?.gate_id ?? '')
          if (!gateId || gateId === 'undefined') return null
          try {
            const gateRes = await client.getObject({ objectId: gateId, include: { json: true } })
            const f = gateRes.object?.json as Record<string, unknown> | null
            if (!f) return null
            return {
              id: gateId,
              name: String(f.nft_name ?? 'Unnamed Gate'),
              price: BigInt(String(f.price_mist ?? '0')),
              paused: Boolean(f.paused),
              frozen: Boolean(f.frozen),
            }
          } catch {
            return null
          }
        }),
      )
      gates.value = gateList.filter((g): g is Gate => g !== null)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  // Auto-load on mount, but only when used inside a component (skips in unit tests).
  if (getCurrentInstance()) onMounted(load)

  return { gates, loading, error, reload: load }
}
