<script setup lang="ts">
// The Activity tab: a paginated log of the access_gate events (passes sold and used) with explorer links per row. The list comes from
// composables/useTreasuryActivity.ts, which tolerates a pruned node history. Related: TreasuryView.vue (hosts it), OverviewTab.vue (shows the start of the same list).
// Vue's reactivity, for the page number and the page of rows.
import { computed, ref } from 'vue'
// The shared building blocks: copy and explorer links, badge, button, table, help text, notice, pager and panel.
import { CopyableAddress, ExplorerLink, UiBadge, UiButton, UiDataTable, UiFieldHint, UiNotice, UiPager, UiPanel } from '@meddleware/ui'
// Builds a block-explorer link.
import { suiExplorerUrl } from '@meddleware/web-utils'
// The event feed and the row type.
import { useTreasuryActivity, type TreasuryEvent } from '../composables/useTreasuryActivity.js'
// The network the explorer links point to.
import { explorerNetwork } from '../config.js'

// The feed: the longest list the console asks for; the other views show the start of it.
const { events, loading, error, notice, reload, indexedFromCheckpoint } = useTreasuryActivity()

// Rows per page.
const PAGE_SIZE = 20
// The zero-based page shown.
const page = ref(0)

// True when there are events beyond this page.
const hasNext = computed(() => (page.value + 1) * PAGE_SIZE < events.value.length)
// The rows of the current page.
const pageEvents = computed(() => events.value.slice(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE))

// The words for each event type: a mint is a sale, a consume is a use.
const eventLabel: Record<TreasuryEvent['type'], string> = {
  AccessMinted: 'Access sold',
  AccessConsumed: 'Access used',
}
</script>

<template>
  <!-- The event log. -->
  <UiPanel title="Revenue Events">
    <!-- A bar with an explanation of where the list starts and the refresh button. -->
    <p class="bar">
      <!-- Shown only when the list came from the indexer, which covers events from a known checkpoint. -->
      <span v-if="indexedFromCheckpoint" class="muted">
        Events are listed from checkpoint {{ indexedFromCheckpoint }} onward. A checkpoint is a finalised batch of Sui transactions, numbered in order.
      </span>
      <!-- Reads the feed again; busy while it loads. -->
      <UiButton variant="secondary" :busy="loading" @click="reload">{{ loading ? 'Loading…' : 'Refresh' }}</UiButton>
    </p>
    <!-- The events could not be read. -->
    <UiNotice v-if="error" type="error" :message="error" />
    <!-- The list is not the full history (the indexer could not be used). -->
    <UiNotice v-if="notice" type="warning" :message="notice" />

    <!-- The event table; while loading it reports a row so the empty text does not flash. -->
    <UiDataTable caption="Revenue events" empty="No events found." :rows="loading ? pageEvents.length || 1 : pageEvents.length">
      <template #head>
        <!-- Column headings, each scoped to its column. -->
        <th scope="col">Type</th>
        <th scope="col">
          Address
          <!-- Help for the Address column, in a popover so a narrow table is not widened. -->
          <UiFieldHint field-id="activity-address">The buyer of a sold pass, or the holder who used one. Click to view in explorer; click the copy icon to copy the full address.</UiFieldHint>
        </th>
        <th scope="col">
          Checkpoint
          <!-- Help for the Checkpoint column (what a checkpoint is, for readers new to Sui). -->
          <UiFieldHint field-id="activity-block">A checkpoint is a batch of Sui transactions the network has finalised, numbered in order, so a higher number is more recent. It plays the part a block does on other blockchains.</UiFieldHint>
        </th>
        <th scope="col">
          Transaction
          <!-- Help for the Transaction column. -->
          <UiFieldHint field-id="activity-tx">Transaction digest — a unique identifier for the transaction that emitted this event. Click to view in explorer; click the copy icon to copy the full digest.</UiFieldHint>
        </th>
      </template>
      <!-- One row per event. -->
      <tr v-for="ev in pageEvents" :key="ev.txDigest">
        <!-- The kind of event, as a badge with its own tone. -->
        <td><UiBadge :tone="ev.type === 'AccessMinted' ? 'ok' : 'neutral'">{{ eventLabel[ev.type] }}</UiBadge></td>
        <td class="mw-mono">
          <!-- The buyer or the holder, copyable and linked. -->
          <CopyableAddress v-if="ev.address" :address="ev.address">
            <ExplorerLink :href="suiExplorerUrl('account', ev.address, explorerNetwork)" :value="ev.address" />
          </CopyableAddress>
          <!-- No address: a dash. -->
          <template v-else>—</template>
        </td>
        <!-- The checkpoint, or a dash when unknown. -->
        <td class="mw-mono">{{ ev.checkpoint ?? '—' }}</td>
        <td class="mw-mono">
          <!-- The transaction digest, copyable and linked. -->
          <CopyableAddress :address="ev.txDigest" label="Copy transaction">
            <ExplorerLink :href="suiExplorerUrl('txblock', ev.txDigest, explorerNetwork)" :value="ev.txDigest" />
          </CopyableAddress>
        </td>
      </tr>
    </UiDataTable>

    <!-- Previous and next; the labelled region names it for assistive technology. -->
    <UiPager :index="page" :has-next="hasNext" label="Event pages" @prev="page--" @next="page++" />
  </UiPanel>
</template>

<style scoped>
/* The bar lays its text and button on one row with a gap. */
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-xs);
  margin: 0 0 var(--space-xs);
}

/* The explanatory text is de-emphasised with the muted token. */
.muted {
  color: var(--muted);
  font-size: var(--font-size-sm);
}
</style>
