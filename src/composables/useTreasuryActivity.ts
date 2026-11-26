// Recent access_gate mints and consumes, newest first, typed by @meddleware/access-gate-client.
// Read from the indexer when one is configured (display data; falls back to the full node). When the indexer is configured but cannot be used
// the list is still shown from the full node, which keeps only recent events: `notice` says so in words and the cause goes to the console.
import { ref, type Ref } from 'vue'
import { listAccessGateEvents, type EventCursor } from '@meddleware/access-gate-client'
import { getSuiClient } from '../wallet.js'
import { INDEXER_URL, network, requireDeployment } from '../config.js'
import { createGeneration } from '@meddleware/web-utils'
import { HISTORY_LIMITED, logCause, plainFailure } from '../availability.js'
import { onChainContext, shared, type Shared } from './chainContext.js'

/** One row of the activity list. */
export interface TreasuryEvent {
  type: 'AccessMinted' | 'AccessConsumed'
  txDigest: string
  checkpoint: string | null
  /** The buyer (or airdrop recipient) of a mint; the NFT owner who spent a use. */
  address: string
}

/** The reactive state and the shared loader of one feed. */
interface ActivityState {
  events: Ref<TreasuryEvent[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  /** A plain note that the list is not the full history (the indexer could not be used), or null. */
  notice: Ref<string | null>
  lastRefresh: Ref<Date | null>
  /** Oldest checkpoint the indexer covers, when the list came from it. */
  indexedFromCheckpoint: Ref<string | null>
  loader: Shared
}

// One feed per limit, shared by every component that asks for that limit: the status bar, the overview and the activity tab all read
// the same list (the console asks for the longest and the others show the start of it), so opening a tab fetches nothing again.
const feeds = new Map<number, ActivityState>()

/** The feed for `limit` events: created on first use and then shared by every component that asks for that limit. */
function feed(limit: number): ActivityState {
  const existing = feeds.get(limit)
  if (existing) return existing
  // The merged event list, newest first.
  const events = ref<TreasuryEvent[]>([])
  // True while a read is in flight.
  const loading = ref(false)
  // A plain sentence when the events could not be read, or null.
  const error = ref<string | null>(null)
  // A plain note when the list is not the full history, or null.
  const notice = ref<string | null>(null)
  // When the list was last read successfully (shown in the status bar).
  const lastRefresh = ref<Date | null>(null)
  // The oldest checkpoint the indexer covers, when the list came from it.
  const indexedFromCheckpoint = ref<string | null>(null)
  // Guards against a slow read for a previous network overwriting a newer one.
  const generation = createGeneration()

  // One shared read per limit.
  const loader = shared(
    async () => {
      // Start a read; `current()` says whether it is still the newest.
      const current = generation.begin()
      loading.value = true
      error.value = null
      notice.value = null
      try {
        // The recorded deployment for the active network (throws NotDeployedError where there is none).
        const d = requireDeployment()
        // The events collected across pages.
        const out: TreasuryEvent[] = []
        // Where the next page starts (null before the first and after the last).
        let cursor: EventCursor | null = null
        // The oldest checkpoint the indexer reported.
        let from: string | null = null
        // The cause of an indexer failure the client recovered from, for the console.
        let indexerError: string | null = null
        // Bounded: each call scans at most a few full-node pages; ten calls cover any realistic limit.
        for (let calls = 0; calls < 10; calls++) {
          // One page of mints and consumes; the client uses the indexer when a URL is given and otherwise (or on its failure) the node.
          const page = await listAccessGateEvents(getSuiClient(), {
            originalId: d.originalId,
            kinds: ['AccessMinted', 'AccessConsumed'],
            limit: Math.min(100, limit - out.length),
            cursor,
            indexer: INDEXER_URL ? { url: INDEXER_URL, network: network.value } : undefined,
          })
          // Map each event to the row the console shows: a mint names its recipient, a consume the NFT owner who spent a use.
          for (const e of page.events) {
            if (e.kind === 'AccessMinted') out.push({ type: e.kind, txDigest: e.txDigest, checkpoint: e.checkpoint, address: e.recipient })
            else if (e.kind === 'AccessConsumed') out.push({ type: e.kind, txDigest: e.txDigest, checkpoint: e.checkpoint, address: e.consumer })
          }
          // Keep the first non-null values the pages report.
          from = page.indexedFromCheckpoint ?? from
          indexerError = page.indexerError ?? indexerError
          // Move on to the next page.
          cursor = page.cursor
          // Stop at the end of the history or when the limit is reached.
          if (!cursor || out.length >= limit) break
        }
        // A newer read has begun: this answer is stale, so drop it.
        if (!current()) return false
        // Trim to the limit (the last page may overshoot).
        events.value = out.slice(0, limit)
        indexedFromCheckpoint.value = from
        // The indexer failed and the node answered alone: say the list may be short, and log the cause.
        if (indexerError) {
          logCause('the event index could not be used, reading the node directly', indexerError, 'warn')
          notice.value = HISTORY_LIMITED
        }
        // Stamp the successful read.
        lastRefresh.value = new Date()
        // Success: remembered by the loader.
        return true
      // A failure: say in plain words what could not be read; the cause goes to the console.
      } catch (e) {
        if (!current()) return false
        error.value = plainFailure('the revenue events', e)
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
      events.value = []
      indexedFromCheckpoint.value = null
      notice.value = null
    },
  )

  // The feed's reactive state and loader, kept in the map for the next caller of the same limit.
  const state = { events, loading, error, notice, lastRefresh, indexedFromCheckpoint, loader }
  feeds.set(limit, state)
  return state
}

/** The recent mints and consumes (at most `limit`, newest first) with loading, error, notice and refresh state, and a `reload`. */
export function useTreasuryActivity(limit = 200) {
  // Everything but the loader is handed to the component.
  const { loader, ...refs } = feed(limit)
  // Load on mount and again when the network changes.
  onChainContext(loader)
  return { ...refs, reload: () => loader.load(true) }
}
