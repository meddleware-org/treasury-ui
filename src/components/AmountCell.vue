<script setup lang="ts">
// Formats a MIST bigint as human SUI (4 dp, trimming trailing zeros below that),
// rendering "—" for null. Display-only; never source-of-truth for accounting.
defineProps<{
  mist: bigint | null
  symbol?: string
  muted?: boolean
}>()

function format(mist: bigint, symbol: string): string {
  if (mist === 0n) return `0 ${symbol}`
  const n = Number(mist) / 1e9
  const s = n >= 0.0001 ? n.toFixed(4) : n.toFixed(9).replace(/0+$/, '').replace(/\.$/, '')
  return `${s} ${symbol}`
}
</script>

<template>
  <span class="dao-amount" :class="{ 'dao-amount--muted': muted }">
    <template v-if="mist !== null">{{ format(mist, symbol ?? 'SUI') }}</template>
    <template v-else>—</template>
  </span>
</template>
