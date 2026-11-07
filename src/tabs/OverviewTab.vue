<script setup lang="ts">
// Overview tab: treasury balance + commission, platform activity counters (gates,
// passes sold and used, counted in the event feed), and a recent-activity list.
import { computed } from 'vue'
import { CopyableAddress, ExplorerLink, UiActivityFeed, UiActivityItem, UiAmount, UiEmptyState, UiLiveStatus, UiNotice, UiPanel, UiStatGrid, UiStatRow } from '@meddleware/ui'
import { suiExplorerUrl } from '@meddleware/web-utils'
import { usePlatformConfig } from '../composables/usePlatformConfig.js'
import { useTreasury } from '../composables/useTreasury.js'
import { useTreasuryActivity, type TreasuryEvent } from '../composables/useTreasuryActivity.js'
import { useGates } from '../composables/useGates.js'
import { distinct } from '../availability.js'
import { explorerNetwork } from '../config.js'

const { config, commissionPct, error: configError } = usePlatformConfig()
const { balance, error: balanceError } = useTreasury(() => config.value?.treasury ?? null)
// The feed is the console's one list; the overview shows its start, and the counters are of what the feed holds.
const { events, loading: eventsLoading, error: eventsError, notice } = useTreasuryActivity()
const { gates, loading: gatesLoading, error: gatesError } = useGates()

// What could not be read, in words (one line each, however many reads failed the same way).
const problems = computed(() => distinct(configError.value, balanceError.value, eventsError.value, gatesError.value))

const eventLabel: Record<TreasuryEvent['type'], string> = {
  AccessMinted: 'Access sold',
  AccessConsumed: 'Access used',
}

const recent = computed(() => events.value.slice(0, 12))
const passesSold = computed(() => events.value.filter((e) => e.type === 'AccessMinted').length)
const passesUsed = computed(() => events.value.filter((e) => e.type === 'AccessConsumed').length)
</script>

<template>
  <div class="overview">
    <UiNotice v-for="problem in problems" :key="problem" class="wide" type="error" :message="problem" />
    <UiNotice v-if="notice" class="wide" type="warning" :message="notice" />

    <UiPanel title="Treasury Balance">
      <UiStatGrid>
        <UiStatRow label="SUI balance"><UiAmount :value="balance" /></UiStatRow>
        <UiStatRow label="Commission rate">{{ commissionPct }}</UiStatRow>
        <UiStatRow label="Treasury address" align="left">
          <CopyableAddress v-if="config?.treasury" :address="config.treasury" :truncate="false">
            <ExplorerLink :href="suiExplorerUrl('account', config.treasury, explorerNetwork)" :value="config.treasury" :truncate="false" />
          </CopyableAddress>
          <template v-else>—</template>
        </UiStatRow>
      </UiStatGrid>
    </UiPanel>

    <UiPanel title="Revenue Activity">
      <UiStatGrid>
        <UiStatRow label="Gates">{{ gatesLoading ? '…' : gates.length }}</UiStatRow>
        <UiStatRow label="Passes sold">{{ passesSold || '—' }}</UiStatRow>
        <UiStatRow label="Passes used">{{ passesUsed || '—' }}</UiStatRow>
      </UiStatGrid>
    </UiPanel>

    <UiPanel class="recent" title="Recent Activity">
      <UiLiveStatus label="Recent activity" :message="eventsLoading ? 'Loading events…' : ''" />
      <UiActivityFeed v-if="!eventsLoading && recent.length">
        <UiActivityItem v-for="ev in recent" :key="ev.txDigest" :type="eventLabel[ev.type]" :time="ev.checkpoint ? `checkpoint ${ev.checkpoint}` : 'checkpoint unknown'" />
      </UiActivityFeed>
      <UiEmptyState v-else-if="!eventsLoading">No recent events.</UiEmptyState>
    </UiPanel>
  </div>
</template>

<style scoped>
.overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
  gap: var(--space-xs);
  align-items: start;
}

.wide {
  grid-column: 1 / -1;
  margin: 0;
}
</style>
