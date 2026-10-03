import { ref } from 'vue'
import { getSuiClient } from '../wallet.js'
import { latest, onChainContext } from './chainContext.js'

export function useEpoch() {
  const epoch = ref<number | null>(null)
  const begin = latest()

  async function load() {
    const current = begin()
    try {
      const res = await getSuiClient().getCurrentSystemState()
      if (current()) epoch.value = Number(res.systemState.epoch)
    } catch {
      // non-fatal — status bar shows "Epoch —"
    }
  }

  onChainContext(load, () => (epoch.value = null))

  return { epoch, reload: load }
}
