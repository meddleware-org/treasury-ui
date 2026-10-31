// Recent access_gate mints and consumes, newest first, typed by @meddleware/access-gate-client.
// Read from the indexer when VITE_INDEXER_URL is set (display data; falls back to the full node).
import { ref, type Ref } from 'vue'
import { listAccessGateEvents, type EventCursor } from '@meddleware/access-gate-client'
import { getSuiClient } from '../wallet.js'
import { INDEXER_URL, network, requireDeployment } from '../config.js'
import { createGeneration, errorMessage } from '@meddleware/web-utils'
import { onChainContext, shared, type Shared } from './chainContext.js'

export interface TreasuryEvent {
  type: 'AccessMinted' | 'AccessConsumed'
  txDigest: string
  checkpoint: string | null
  /** The buyer (or airdrop recipient) of a mint; the NFT owner who spent a use. */
  address: string
}

interface ActivityState {
  events: Ref<TreasuryEvent[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  lastRefresh: Ref<Date | null>
  /** Oldest checkpoint the indexer covers, when the list came from it. */
  indexedFromCheckpoint: Ref<string | null>
  loader: Shared
}

// One feed per limit, shared by every component that asks for that limit: the status bar, the overview and the activity tab all read
// the same list (the console asks for the longest and the others show the start of it), so opening a tab fetches nothing again.
const feeds = new Map<number, ActivityState>()

function feed(limit: number): ActivityState {
  const existing = feeds.get(limit)
  if (existing) return existing
  const events = ref<TreasuryEvent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastRefresh = ref<Date | null>(null)
  const indexedFromCheckpoint = ref<string | null>(null)
  const generation = createGeneration()

  const loader = shared(
    async () => {
      const current = generation.begin()
      loading.value = true
      error.value = null
      try {
        const d = requireDeployment()
        const out: TreasuryEvent[] = []
        let cursor: EventCursor | null = null
        let from: string | null = null
        // Bounded: each call scans at most a few full-node pages; ten calls cover any realistic limit.
        for (let calls = 0; calls < 10; calls++) {
          const page = await listAccessGateEvents(getSuiClient(), {
            originalId: d.originalId,
            kinds: ['AccessMinted', 'AccessConsumed'],
            limit: Math.min(100, limit - out.length),
            cursor,
            indexer: INDEXER_URL ? { url: INDEXER_URL, network: network.value } : undefined,
          })
          for (const e of page.events) {
            if (e.kind === 'AccessMinted') out.push({ type: e.kind, txDigest: e.txDigest, checkpoint: e.checkpoint, address: e.recipient })
            else if (e.kind === 'AccessConsumed') out.push({ type: e.kind, txDigest: e.txDigest, checkpoint: e.checkpoint, address: e.consumer })
          }
          from = page.indexedFromCheckpoint ?? from
          cursor = page.cursor
          if (!cursor || out.length >= limit) break
        }
        if (!current()) return false
        events.value = out.slice(0, limit)
        indexedFromCheckpoint.value = from
        lastRefresh.value = new Date()
        return true
      } catch (e) {
        if (!current()) return false
        error.value = errorMessage(e)
        return false
      } finally {
        if (current()) loading.value = false
      }
    },
    () => {
      generation.invalidate()
      events.value = []
      indexedFromCheckpoint.value = null
    },
  )

  const state = { events, loading, error, lastRefresh, indexedFromCheckpoint, loader }
  feeds.set(limit, state)
  return state
}

export function useTreasuryActivity(limit = 200) {
  const { loader, ...refs } = feed(limit)
  onChainContext(loader)
  return { ...refs, reload: () => loader.load(true) }
}
