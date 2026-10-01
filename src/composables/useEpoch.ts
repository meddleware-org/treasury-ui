import { ref } from 'vue'
import { getSuiClient } from '../wallet.js'
import { onChainContext } from './chainContext.js'

export function useEpoch() {
  const epoch = ref<number | null>(null)

  async function load() {
    try {
      const client = getSuiClient()
      const res = await client.getCurrentSystemState()
      epoch.value = Number(res.systemState.epoch)
    } catch {
      // non-fatal — status bar shows "Epoch —"
    }
  }

  onChainContext(load, () => (epoch.value = null))

  return { epoch, reload: load }
}
