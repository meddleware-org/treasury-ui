<script setup lang="ts">
// Overview tab: treasury balance + commission, platform activity counters (active gates,
// accesses minted/consumed derived from the event feed), and a recent-activity list.
import { computed } from 'vue'
import { CopyableAddress, ExplorerLink, UiActivityFeed, UiActivityItem, UiAmount, UiEmptyState, UiLiveStatus, UiPanel, UiStatGrid, UiStatRow } from '@meddleware/ui'
import { suiExplorerUrl } from '@meddleware/web-utils'
import { usePlatformConfig } from '../composables/usePlatformConfig.js'
import { useTreasury } from '../composables/useTreasury.js'
import { useTreasuryActivity, type TreasuryEvent } from '../composables/useTreasuryActivity.js'
import { useGates } from '../composables/useGates.js'
import { explorerNetwork } from '../config.js'

const { config, commissionPct } = usePlatformConfig()
const { balance } = useTreasury(() => config.value?.treasury ?? null)
// The feed is the console's one list; the overview shows its start, and the counters are of what the feed holds.
const { events, loading: eventsLoading } = useTreasuryActivity()
const { gates, loading: gatesLoading } = useGates()

const eventLabel: Record<TreasuryEvent['type'], string> = {
  AccessMinted: 'Access sold',
  AccessConsumed: 'Access used',
}

const recent = computed(() => events.value.slice(0, 12))
const accessesMinted = computed(() => events.value.filter((e) => e.type === 'AccessMinted').length)
const accessesConsumed = computed(() => events.value.filter((e) => e.type === 'AccessConsumed').length)
</script>

<template>
  <div class="overview">
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
        <UiStatRow label="Active gates">{{ gatesLoading ? '…' : gates.length }}</UiStatRow>
        <UiStatRow label="Accesses minted">{{ accessesMinted || '—' }}</UiStatRow>
        <UiStatRow label="Accesses consumed">{{ accessesConsumed || '—' }}</UiStatRow>
      </UiStatGrid>
    </UiPanel>

    <UiPanel class="recent" title="Recent Activity">
      <UiLiveStatus label="Recent activity" :message="eventsLoading ? 'Loading events…' : ''" />
      <UiActivityFeed v-if="!eventsLoading && recent.length">
        <UiActivityItem v-for="ev in recent" :key="ev.txDigest" :type="eventLabel[ev.type]" :time="`ckpt ${ev.checkpoint ?? '?'}`" />
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
</style>
