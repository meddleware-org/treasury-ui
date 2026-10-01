// Reads the PlatformConfig shared object and exposes the treasury address + commission rate (bps).
// Source of truth for the commission model and for whose AdminCaps the gate discovery looks up.
import { ref } from 'vue'
import { fetchPlatformConfig } from '@meddleware/access-gate-client'
import { getSuiClient } from '../wallet.js'
import { requireDeployment } from '../config.js'
import { latest, onChainContext } from './chainContext.js'

export interface PlatformConfig {
  treasury: string
  commissionBps: number
}

export function usePlatformConfig() {
  const config = ref<PlatformConfig | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const begin = latest()

  async function load() {
    const current = begin()
    loading.value = true
    error.value = null
    try {
      const d = requireDeployment()
      const c = await fetchPlatformConfig(getSuiClient(), d.platformConfigId, d.originalId)
      if (!current()) return
      config.value = { treasury: c.treasury, commissionBps: Number(c.commissionBps) }
    } catch (e) {
      if (!current()) return
      config.value = null
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      if (current()) loading.value = false
    }
  }

  onChainContext(load, () => (config.value = null))

  return { config, loading, error, reload: load }
}
