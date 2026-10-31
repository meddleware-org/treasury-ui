import { ref } from 'vue'
import { createGeneration } from '@meddleware/web-utils'
import { getSuiClient } from '../wallet.js'
import { onChainContext, shared } from './chainContext.js'

// One epoch for the whole console: the status bar and anything else that shows it read the same value.
const epoch = ref<number | null>(null)
const generation = createGeneration()

const loader = shared(
  async () => {
    const current = generation.begin()
    try {
      const res = await getSuiClient().getCurrentSystemState()
      if (current()) epoch.value = Number(res.systemState.epoch)
      return true
    } catch {
      return false // non-fatal — the status bar shows "Epoch —"
    }
  },
  () => {
    generation.invalidate()
    epoch.value = null
  },
)

export function useEpoch() {
  onChainContext(loader)
  return { epoch, reload: () => loader.load(true) }
}
