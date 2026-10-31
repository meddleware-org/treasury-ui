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

export function shared(run: () => Promise<boolean>, clear: () => void): Shared {
  let inflight: Promise<void> | null = null
  let done = false
  return {
    load(force = false) {
      if (inflight) return inflight
      if (done && !force) return Promise.resolve()
      inflight = run()
        .then((ok) => {
          done = ok
        })
        .finally(() => {
          inflight = null
        })
      return inflight
    },
    reset() {
      done = false
      clear()
    },
  }
}

/**
 * Load on mount and again whenever the network changes, clearing the previous network's data first. Only inside a component (unit tests
 * call `reload()` directly).
 */
export function onChainContext(s: Shared): void {
  if (!getCurrentInstance()) return
  onMounted(() => void s.load())
  watch(network, () => {
    s.reset()
    void s.load(true)
  })
}
