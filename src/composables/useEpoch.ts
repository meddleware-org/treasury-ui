import { ref, onMounted, getCurrentInstance } from 'vue'
import { getSuiClient } from '../wallet.js'

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

  // Auto-load on mount, but only when used inside a component (skips in unit tests).
  if (getCurrentInstance()) onMounted(load)

  return { epoch, reload: load }
}
