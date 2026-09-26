// Reads the PlatformConfig shared object once on mount and exposes the treasury
// address + commission rate (bps). Source of truth for the commission model and for
// whose AdminCaps the gate discovery (useGates) looks up.
import { ref, onMounted, getCurrentInstance } from 'vue'
import { getSuiClient } from '../wallet.js'
import { CONFIG_ID } from '../config.js'

export interface PlatformConfig {
  treasury: string
  commissionBps: number
}

export function usePlatformConfig() {
  const config = ref<PlatformConfig | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    if (!CONFIG_ID) { error.value = 'PlatformConfig ID not configured'; return }
    loading.value = true
    error.value = null
    try {
      const client = getSuiClient()
      const res = await client.getObject({ objectId: CONFIG_ID, include: { json: true } })
      const fields = res.object.json as Record<string, unknown> | null
      if (!fields) throw new Error('unexpected object structure')
      config.value = {
        treasury: String(fields.treasury),
        commissionBps: Number(fields.commission_bps),
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  // Auto-load on mount, but only when used inside a component (skips in unit tests).
  if (getCurrentInstance()) onMounted(load)

  return { config, loading, error, reload: load }
}
