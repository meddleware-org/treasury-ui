// Reads the SUI balance of the treasury address. Reactive to the address getter so it
// refetches when usePlatformConfig resolves; clears to null while the address is unknown.
import { ref, watch } from 'vue'
import { getSuiClient } from '../wallet.js'

export function useTreasury(treasuryAddress: () => string | null) {
  const balance = ref<bigint | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(address: string) {
    loading.value = true
    error.value = null
    try {
      const client = getSuiClient()
      const res = await client.getBalance({ owner: address, coinType: '0x2::sui::SUI' })
      balance.value = BigInt(res.balance.coinBalance)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  watch(
    treasuryAddress,
    (addr) => { if (addr) { void load(addr) } else { balance.value = null } },
    { immediate: true },
  )

  return { balance, loading, error }
}
