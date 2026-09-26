import { ref, onMounted, getCurrentInstance } from 'vue'
import { getSuiClient } from '../wallet.js'
import { PACKAGE_ID } from '../config.js'

export interface TreasuryEvent {
  type: 'AccessMinted' | 'AccessConsumed' | 'AccessBurned'
  txDigest: string
  checkpoint: string | null
  address?: string
}

export function useTreasuryActivity(limit = 20) {
  const events = ref<TreasuryEvent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastRefresh = ref<Date | null>(null)

  async function load() {
    if (!PACKAGE_ID) return
    loading.value = true
    error.value = null
    try {
      const client = getSuiClient()
      const eventTypes = [
        `${PACKAGE_ID}::access_gate::AccessMintedEvent`,
        `${PACKAGE_ID}::access_gate::AccessConsumedEvent`,
      ]

      const results = await Promise.allSettled(
        eventTypes.map((t) =>
          client.listEvents({ filter: { eventType: t }, limit, order: 'descending' }),
        ),
      )

      const all: TreasuryEvent[] = []
      for (const r of results) {
        if (r.status !== 'fulfilled') continue
        for (const e of r.value.events) {
          const typeName = e.eventType.split('::').pop() ?? ''
          const label =
            typeName === 'AccessMintedEvent' ? 'AccessMinted'
            : typeName === 'AccessConsumedEvent' ? 'AccessConsumed'
            : 'AccessBurned'
          const f = (e.json ?? {}) as Record<string, unknown>
          all.push({
            type: label as TreasuryEvent['type'],
            txDigest: e.transactionDigest,
            checkpoint: e.checkpoint ?? null,
            address: String(f.recipient ?? f.creator ?? f.sender ?? ''),
          })
        }
      }

      // Sort globally by checkpoint descending so the merged list is newest-first across all types.
      all.sort((a, b) => {
        const ca = BigInt(a.checkpoint ?? '0')
        const cb = BigInt(b.checkpoint ?? '0')
        if (cb > ca) return 1
        if (cb < ca) return -1
        return 0
      })
      events.value = all.slice(0, limit)
      lastRefresh.value = new Date()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  // Auto-load on mount, but only when used inside a component (skips in unit tests).
  if (getCurrentInstance()) onMounted(load)

  return { events, loading, error, lastRefresh, reload: load }
}
