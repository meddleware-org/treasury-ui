// Reads the SUI the treasury address holds: its coin objects plus its address balance (SIP-58), so
// funds sent with `send_funds` are counted. Reactive to the address getter so it refetches when
// usePlatformConfig resolves; clears to null while the address is unknown or unreadable. A slower,
// older read never overwrites a newer one.
import { ref, watch } from 'vue'
import { getSuiClient } from '../wallet.js'
import { latest } from './chainContext.js'

export function useTreasury(treasuryAddress: () => string | null) {
  const balance = ref<bigint | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const begin = latest()

  async function load(address: string) {
    const current = begin()
    loading.value = true
    error.value = null
    try {
      const res = await getSuiClient().core.getBalance({ owner: address, coinType: '0x2::sui::SUI' })
      if (current()) balance.value = BigInt(res.balance.balance)
    } catch (e) {
      if (!current()) return
      balance.value = null
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      if (current()) loading.value = false
    }
  }

  watch(
    treasuryAddress,
    (addr) => {
      if (addr) {
        void load(addr)
      } else {
        begin()
        balance.value = null
        loading.value = false
      }
    },
    { immediate: true },
  )

  return { balance, loading, error }
}
