<script setup lang="ts">
// The Overview tab: treasury balance and fee rate, counters of what the event feed holds (gates, passes sold and used) and the most recent events.
// Related: TreasuryView.vue (hosts it), composables/ (the reads), ActivityTab.vue (the full list).
// Vue's `computed`, for the problem list, the recent events and the counters.
import { computed } from 'vue'
// The shared building blocks: copy and explorer links, amounts, the activity feed, notices, the panel and stat layouts.
import { CopyableAddress, ExplorerLink, UiActivityFeed, UiActivityItem, UiAmount, UiEmptyState, UiLiveStatus, UiNotice, UiPanel, UiStatGrid, UiStatRow } from '@meddleware/ui'
// Builds a block-explorer link.
import { suiExplorerUrl } from '@meddleware/web-utils'
// The platform settings.
import { usePlatformConfig } from '../composables/usePlatformConfig.js'
// The treasury balance.
import { useTreasury } from '../composables/useTreasury.js'
// The event feed and the row type.
import { useTreasuryActivity, type TreasuryEvent } from '../composables/useTreasuryActivity.js'
// The gates the treasury administers.
import { useGates } from '../composables/useGates.js'
// Collapses identical messages into one line.
import { distinct } from '../availability.js'
// The network the explorer links point to.
import { explorerNetwork } from '../config.js'

// The platform settings.
const { config, commissionPct, error: configError } = usePlatformConfig()
// The balance follows the treasury address as soon as it is known.
const { balance, error: balanceError } = useTreasury(() => config.value?.treasury ?? null)
// The feed is the console's one list; the overview shows its start, and the counters are of what the feed holds.
// The feed is the console's one list; the overview shows its start, and the counters are of what the feed holds.
const { events, loading: eventsLoading, error: eventsError, notice } = useTreasuryActivity()
// The gates.
const { gates, loading: gatesLoading, error: gatesError } = useGates()

// What could not be read, in words (one line each, however many reads failed the same way).
// What could not be read, in words (one line each, however many reads failed the same way).
const problems = computed(() => distinct(configError.value, balanceError.value, eventsError.value, gatesError.value))

// The words for each event type: a mint is a sale, a consume is a use.
const eventLabel: Record<TreasuryEvent['type'], string> = {
  AccessMinted: 'Access sold',
  AccessConsumed: 'Access used',
}

// The twelve most recent events.
const recent = computed(() => events.value.slice(0, 12))
// Sales among the events the feed holds.
const passesSold = computed(() => events.value.filter((e) => e.type === 'AccessMinted').length)
// Uses among the events the feed holds.
const passesUsed = computed(() => events.value.filter((e) => e.type === 'AccessConsumed').length)
</script>

<template>
  <!-- A grid of panels that wraps to the width. -->
  <div class="overview">
    <!-- One error notice per distinct problem, across the whole grid. -->
    <UiNotice v-for="problem in problems" :key="problem" class="wide" type="error" :message="problem" />
    <!-- The list is not the full history. -->
    <UiNotice v-if="notice" class="wide" type="warning" :message="notice" />

    <!-- The balance panel. -->
    <UiPanel title="Treasury Balance">
      <UiStatGrid>
        <!-- The balance in SUI (the amount component formats MIST). -->
        <UiStatRow label="SUI balance"><UiAmount :value="balance" /></UiStatRow>
        <!-- The commission as a percentage. -->
        <UiStatRow label="Platform fee rate">{{ commissionPct }}</UiStatRow>
        <!-- The address, with copy and explorer link, or a dash until known. -->
        <UiStatRow label="Treasury address" align="left">
          <CopyableAddress v-if="config?.treasury" :address="config.treasury" :truncate="false">
            <ExplorerLink :href="suiExplorerUrl('account', config.treasury, explorerNetwork)" :value="config.treasury" :truncate="false" />
          </CopyableAddress>
          <template v-else>—</template>
        </UiStatRow>
      </UiStatGrid>
    </UiPanel>

    <!-- The counters panel. -->
    <UiPanel title="Revenue Activity">
      <UiStatGrid>
        <!-- The number of gates, or an ellipsis while loading. -->
        <UiStatRow label="Gates">{{ gatesLoading ? '…' : gates.length }}</UiStatRow>
        <!-- Passes sold, or a dash when none are in the feed. -->
        <UiStatRow label="Passes sold">{{ passesSold || '—' }}</UiStatRow>
        <!-- Passes used, or a dash when none are in the feed. -->
        <UiStatRow label="Passes used">{{ passesUsed || '—' }}</UiStatRow>
      </UiStatGrid>
    </UiPanel>

    <!-- The most recent events. -->
    <UiPanel class="recent" title="Recent Activity">
      <!-- Announces loading to assistive technology. -->
      <UiLiveStatus label="Recent activity" :message="eventsLoading ? 'Loading events…' : ''" />
      <!-- The list of recent events. -->
      <UiActivityFeed v-if="!eventsLoading && recent.length">
        <!-- One event: its kind and the checkpoint it landed in. -->
        <UiActivityItem v-for="ev in recent" :key="ev.txDigest" :type="eventLabel[ev.type]" :time="ev.checkpoint ? `checkpoint ${ev.checkpoint}` : 'checkpoint unknown'" />
      </UiActivityFeed>
      <!-- No events to show. -->
      <UiEmptyState v-else-if="!eventsLoading">No recent events.</UiEmptyState>
    </UiPanel>
  </div>
</template>

<style scoped>
/* A responsive grid: as many columns as fit, each at least 20rem or the full width. */
.overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
  gap: var(--space-xs);
  align-items: start;
}

/* A notice spans every column and has no margin of its own. */
.wide {
  grid-column: 1 / -1;
  margin: 0;
}
</style>
