// The current Sui epoch, shown in the status bar. A read-only composable: one shared read of the node's system state, reset on a network change.
// Related: chainContext.ts (the shared load), TreasuryView.vue (the status bar that shows it).
import { ref } from 'vue'
import { createGeneration, errorMessage } from '@meddleware/web-utils'
import { logCause } from '../availability.js'
import { getSuiClient } from '../wallet.js'
import { onChainContext, shared } from './chainContext.js'

// One epoch for the whole console: the status bar and anything else that shows it read the same value.
// The epoch, or null until it is known (the status bar then shows a dash).
const epoch = ref<number | null>(null)
// Guards against a slow read for a previous network overwriting a newer one.
const generation = createGeneration()

// The shared loader: one read of the system state serves every component that asks.
const loader = shared(
  async () => {
    // Start a read; `current()` says whether it is still the newest.
    const current = generation.begin()
    try {
      // The node's current system state carries the epoch number.
      const res = await getSuiClient().getCurrentSystemState()
      // Keep the answer only when no newer read has begun.
      if (current()) epoch.value = Number(res.systemState.epoch)
      // A success: the loader remembers it and does not read again.
      return true
    } catch (e) {
      // Non-fatal: the status bar shows "Epoch —"; the cause is for the developer.
      logCause('reading the current epoch failed', errorMessage(e), 'warn')
      // A failure is not remembered, so the next component to mount tries again.
      return false
    }
  },
  () => {
    // Discard any read still in flight (it is for the previous network).
    generation.invalidate()
    // Back to unknown until the new network answers.
    epoch.value = null
  },
)

/** The epoch ref and a `reload` that reads it again; loading starts on mount and on a network change. */
export function useEpoch() {
  // Load when a component using this mounts, and again when the network changes.
  onChainContext(loader)
  return { epoch, reload: () => loader.load(true) }
}
