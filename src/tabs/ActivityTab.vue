<script setup lang="ts">
// Activity tab: paginated on-chain access-gate event log (sold / used) with per-row explorer links. Data comes from
// useTreasuryActivity (pruning-tolerant, merged feed).
import { computed, ref } from 'vue'
import { CopyableAddress, ExplorerLink, UiBadge, UiButton, UiDataTable, UiFieldHint, UiNotice, UiPager, UiPanel } from '@meddleware/ui'
import { suiExplorerUrl } from '@meddleware/web-utils'
import { useTreasuryActivity, type TreasuryEvent } from '../composables/useTreasuryActivity.js'
import { explorerNetwork } from '../config.js'

const { events, loading, error, notice, reload, indexedFromCheckpoint } = useTreasuryActivity()

const PAGE_SIZE = 20
const page = ref(0)

const hasNext = computed(() => (page.value + 1) * PAGE_SIZE < events.value.length)
const pageEvents = computed(() => events.value.slice(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE))

const eventLabel: Record<TreasuryEvent['type'], string> = {
  AccessMinted: 'Access sold',
  AccessConsumed: 'Access used',
}
</script>

<template>
  <UiPanel title="Revenue Events">
    <p class="bar">
      <span v-if="indexedFromCheckpoint" class="muted">
        Events are listed from checkpoint {{ indexedFromCheckpoint }} onward. A checkpoint is a finalised batch of Sui transactions, numbered in order.
      </span>
      <UiButton variant="secondary" :busy="loading" @click="reload">{{ loading ? 'Loading…' : 'Refresh' }}</UiButton>
    </p>
    <UiNotice v-if="error" type="error" :message="error" />
    <UiNotice v-if="notice" type="warning" :message="notice" />

    <UiDataTable caption="Revenue events" empty="No events found." :rows="loading ? pageEvents.length || 1 : pageEvents.length">
      <template #head>
        <th scope="col">Type</th>
        <th scope="col">
          Address
          <UiFieldHint field-id="activity-address">The buyer of a sold pass, or the holder who used one. Click to view in explorer; click the copy icon to copy the full address.</UiFieldHint>
        </th>
        <th scope="col">
          Checkpoint
          <UiFieldHint field-id="activity-block">A checkpoint is a batch of Sui transactions the network has finalised, numbered in order, so a higher number is more recent. It plays the part a block does on other blockchains.</UiFieldHint>
        </th>
        <th scope="col">
          Transaction
          <UiFieldHint field-id="activity-tx">Transaction digest — a unique identifier for the transaction that emitted this event. Click to view in explorer; click the copy icon to copy the full digest.</UiFieldHint>
        </th>
      </template>
      <tr v-for="ev in pageEvents" :key="ev.txDigest">
        <td><UiBadge :tone="ev.type === 'AccessMinted' ? 'ok' : 'neutral'">{{ eventLabel[ev.type] }}</UiBadge></td>
        <td class="mw-mono">
          <CopyableAddress v-if="ev.address" :address="ev.address">
            <ExplorerLink :href="suiExplorerUrl('account', ev.address, explorerNetwork)" :value="ev.address" />
          </CopyableAddress>
          <template v-else>—</template>
        </td>
        <td class="mw-mono">{{ ev.checkpoint ?? '—' }}</td>
        <td class="mw-mono">
          <CopyableAddress :address="ev.txDigest" label="Copy transaction">
            <ExplorerLink :href="suiExplorerUrl('txblock', ev.txDigest, explorerNetwork)" :value="ev.txDigest" />
          </CopyableAddress>
        </td>
      </tr>
    </UiDataTable>

    <UiPager :index="page" :has-next="hasNext" label="Event pages" @prev="page--" @next="page++" />
  </UiPanel>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-xs);
  margin: 0 0 var(--space-xs);
}

.muted {
  color: var(--muted);
  font-size: var(--font-size-sm);
}
</style>
