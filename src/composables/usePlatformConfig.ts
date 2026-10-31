// Reads the PlatformConfig shared object and exposes the treasury address + commission rate (bps).
// Source of truth for the commission model and for whose AdminCaps the gate discovery looks up. One read serves every tab.
import { computed, ref } from 'vue'
import { fetchPlatformConfig } from '@meddleware/access-gate-client'
import { createGeneration, errorMessage } from '@meddleware/web-utils'
import { getSuiClient } from '../wallet.js'
import { requireDeployment } from '../config.js'
import { onChainContext, shared } from './chainContext.js'

export interface PlatformConfig {
  treasury: string
  commissionBps: number
}

const config = ref<PlatformConfig | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const generation = createGeneration()
/** The commission as a percentage for people (`0.20%`), or `—` until it is known. */
const commissionPct = computed(() => (config.value ? `${(config.value.commissionBps / 100).toFixed(2)}%` : '—'))

const loader = shared(
  async () => {
    const current = generation.begin()
    loading.value = true
    error.value = null
    try {
      const d = requireDeployment()
      const c = await fetchPlatformConfig(getSuiClient(), d.platformConfigId, d.originalId)
      if (!current()) return false
      config.value = { treasury: c.treasury, commissionBps: Number(c.commissionBps) }
      return true
    } catch (e) {
      if (!current()) return false
      config.value = null
      error.value = errorMessage(e)
      return false
    } finally {
      if (current()) loading.value = false
    }
  },
  () => {
    generation.invalidate()
    config.value = null
    error.value = null
  },
)

export function usePlatformConfig() {
  onChainContext(loader)
  return { config, loading, error, commissionPct, reload: () => loader.load(true) }
}
