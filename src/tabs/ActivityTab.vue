<script setup lang="ts">
// History tab: paginated on-chain access-gate event log (sold / used / burned) with
// per-row explorer links. Data comes from useTreasuryActivity (pruning-tolerant, merged feed).
import { ref, computed } from 'vue'
import { useTreasuryActivity } from '../composables/useTreasuryActivity.js'
import {
  CopyableAddress,
  ExplorerLink,
  suiExplorerUrl,
  UiDataTable,
  UiBadge,
  UiToolbarButton,
} from '@meddleware/ui'
import { explorerNetwork } from '../config.js'
import type { TreasuryEvent } from '../composables/useTreasuryActivity.js'

const { events, loading, error, reload, indexedFromCheckpoint } = useTreasuryActivity(200)

const PAGE_SIZE = 20
const page = ref(1)

const totalPages = computed(() => Math.max(1, Math.ceil(events.value.length / PAGE_SIZE)))
const pageEvents = computed(() =>
  events.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
)

function prevPage() { if (page.value > 1) page.value-- }
function nextPage() { if (page.value < totalPages.value) page.value++ }

const eventLabel: Record<TreasuryEvent['type'], string> = {
  AccessMinted: 'Access Sold',
  AccessConsumed: 'Access Used',
}

function badgeVariant(type: TreasuryEvent['type']): 'active' | 'closed' {
  return type === 'AccessMinted' ? 'active' : 'closed'
}
</script>

<template>
  <header class="activity__head">
    <h2 class="dao-section-title">Revenue Events</h2>
    <UiToolbarButton :disabled="loading" @click="reload">
      {{ loading ? 'Loading…' : 'Refresh' }}
    </UiToolbarButton>
  </header>

  <p v-if="error" class="dao-muted">{{ error }}</p>
  <p v-if="indexedFromCheckpoint" class="dao-muted">Indexed since checkpoint {{ indexedFromCheckpoint }}.</p>

  <UiDataTable v-if="pageEvents.length || loading" :empty="'No events'">
    <template #head>
      <th>Type</th>
      <th>
        Address
        <abbr class="dao-info" title="The buyer of a sold pass, or the holder who used one. Click to view in explorer; click the copy icon to copy the full address.">?</abbr>
      </th>
      <th>
        Block
        <abbr class="dao-info" title="Sui checkpoint sequence number — equivalent to a block height in other blockchains. Each checkpoint finalizes a batch of transactions; higher numbers are more recent.">?</abbr>
      </th>
      <th>
        Transaction
        <abbr class="dao-info" title="Transaction digest — a unique identifier for the transaction that emitted this event. Click to view in explorer; click the copy icon to copy the full digest.">?</abbr>
      </th>
    </template>
    <tr v-for="ev in pageEvents" :key="ev.txDigest">
      <td><UiBadge :variant="badgeVariant(ev.type)">{{ eventLabel[ev.type] }}</UiBadge></td>
      <td class="dao-mono activity__cell dao-nowrap">
        <CopyableAddress v-if="ev.address && ev.address !== 'undefined'" :address="ev.address">
          <ExplorerLink :href="suiExplorerUrl('account', ev.address, explorerNetwork)" :value="ev.address" />
        </CopyableAddress>
        <span v-else>—</span>
      </td>
      <td class="dao-mono activity__cell">
        {{ ev.checkpoint ? '#' + ev.checkpoint : '—' }}
      </td>
      <td class="dao-mono activity__cell dao-nowrap">
        <CopyableAddress :address="ev.txDigest" label="Copy transaction">
          <ExplorerLink :href="suiExplorerUrl('txblock', ev.txDigest, explorerNetwork)" :value="ev.txDigest" />
        </CopyableAddress>
      </td>
    </tr>
  </UiDataTable>
  <p v-else-if="!loading" class="dao-placeholder">No events found.</p>

  <nav v-if="totalPages > 1" class="dao-pagination" aria-label="Event pages">
    <UiToolbarButton :disabled="page === 1" @click="prevPage">← Prev</UiToolbarButton>
    <span class="dao-muted">Page {{ page }} / {{ totalPages }}</span>
    <UiToolbarButton :disabled="page === totalPages" @click="nextPage">Next →</UiToolbarButton>
  </nav>
</template>

<style scoped>
.activity__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.activity__head .dao-section-title {
  margin: 0;
}
.activity__cell {
  font-size: 0.72rem;
}
</style>
