// The shared-load helper behind every composable of the console. Several components ask for the same chain data (the status bar, the
// overview and a tab); `shared` makes them one read, and `onChainContext` loads it on mount and again when the network changes.
// Related: useEpoch.ts, useGates.ts, usePlatformConfig.ts and useTreasuryActivity.ts use it; tests/chain-context.test.ts covers it.
import { getCurrentInstance, onMounted, watch } from 'vue'
import { network } from '../config.js'

/**
 * One load shared by every component that uses it. The first caller loads; callers while that load is in flight wait for the same one,
 * and callers after it get what is there (a tab switch re-reads nothing). `reload()` fetches again; a change of network clears and loads.
 * A load reports whether it succeeded: a failure is not remembered as done, so the next component to mount tries again.
 */
export interface Shared {
  /** Load unless there is a good result already (`force` always fetches, joining one in flight). */
  load(force?: boolean): Promise<void>
  /** Forget the result (the network changed). */
  reset(): void
}

/** Make a shared load: `run` fetches and says whether it succeeded, `clear` empties what the view shows. */
export function shared(run: () => Promise<boolean>, clear: () => void): Shared {
  // `reset()` starts a new epoch. A load belongs to the epoch it began in: a caller in a later epoch never joins it (its answer is for the
  // previous network, and the view has already discarded it), and it never marks the later epoch done.
  // The counter that `reset()` advances.
  let epoch = 0
  // The load now in flight, with the epoch it began in, so a second caller can join it.
  let inflight: { epoch: number; promise: Promise<void> } | null = null
  // True once a load of the current epoch succeeded: later callers then read nothing again.
  let done = false
  // The two operations a component uses.
  return {
    load(force = false) {
      // Join a load already in flight in this epoch rather than starting a second one.
      if (inflight && inflight.epoch === epoch) return inflight.promise
      // A good result is already there and nobody asked to refresh: nothing to do.
      if (done && !force) return Promise.resolve()
      // Remember the epoch this load belongs to.
      const mine = epoch
      const promise: Promise<void> = run()
        .then((ok) => {
          // Only a load of the current epoch may mark the data done; a stale answer must not.
          if (mine === epoch) done = ok
        })
        .finally(() => {
          // Clear the in-flight marker, unless a newer load already replaced it.
          if (inflight?.promise === promise) inflight = null
        })
      // Record the load so a caller in the same epoch can join it.
      inflight = { epoch: mine, promise }
      return promise
    },
    reset() {
      // A new epoch: any load still in flight is now for the old network.
      epoch++
      // Nothing is loaded for this epoch yet.
      done = false
      // Empty what the view shows (the previous network's data).
      clear()
    },
  }
}

/**
 * Load on mount and again whenever the network changes, clearing the previous network's data first. Only inside a component (unit tests
 * call `reload()` directly).
 */
export function onChainContext(s: Shared): void {
  // Outside a component (a unit test) there is nothing to hook into; the test calls `reload()` itself.
  if (!getCurrentInstance()) return
  // Load when the component mounts; a component that mounts later reuses the same result.
  onMounted(() => void s.load())
  // When the network changes: forget the old data, then load for the new network.
  watch(network, () => {
    s.reset()
    void s.load(true)
  })
}
