<script setup lang="ts">
// Overview tab: treasury balance + commission, platform activity counters (active gates,
// accesses minted/consumed derived from the event feed), and a recent-activity list.
import { computed } from 'vue'
import AmountCell from '../components/AmountCell.vue'
import { usePlatformConfig } from '../composables/usePlatformConfig.js'
import { useTreasury } from '../composables/useTreasury.js'
import { useTreasuryActivity } from '../composables/useTreasuryActivity.js'
import { useGates } from '../composables/useGates.js'
import {
  CopyableAddress,
  ExplorerLink,
  suiExplorerUrl,
  UiPanel,
  UiStatGrid,
  UiStatRow,
  UiActivityFeed,
  UiActivityItem,
} from '@meddleware/ui'
import { explorerNetwork } from '../config.js'
import type { TreasuryEvent } from '../composables/useTreasuryActivity.js'

const { config } = usePlatformConfig()
const { balance } = useTreasury(() => config.value?.treasury ?? null)
const { events, loading: eventsLoading } = useTreasuryActivity(12)
const { gates, loading: gatesLoading } = useGates()

const eventLabel: Record<TreasuryEvent['type'], string> = {
  AccessMinted: 'Access sold',
  AccessConsumed: 'Access used',
}

const commissionPct = computed(() =>
  config.value ? (config.value.commissionBps / 100).toFixed(2) + '%' : '—',
)

const accessesMinted = computed(() => events.value.filter((e) => e.type === 'AccessMinted').length)
const accessesConsumed = computed(() => events.value.filter((e) => e.type === 'AccessConsumed').length)
</script>

<template>
  <div class="dao-overview-cols">
    <!-- Left: treasury summary -->
    <div class="dao-stack dao-stack--tight">
      <UiPanel title="Treasury Balance">
        <UiStatGrid>
          <UiStatRow label="SUI balance"><AmountCell :mist="balance" /></UiStatRow>
          <UiStatRow label="Commission rate">{{ commissionPct }}</UiStatRow>
          <UiStatRow label="Treasury address" align="left">
            <CopyableAddress v-if="config?.treasury" :address="config.treasury">
              <ExplorerLink :href="suiExplorerUrl('account', config.treasury, explorerNetwork)" :value="config.treasury" />
            </CopyableAddress>
            <span v-else class="dao-mono dao-mono--sm">—</span>
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
    </div>

    <!-- Right: recent activity -->
    <UiPanel title="Recent Activity">
      <p v-if="eventsLoading" class="dao-muted dao-flush">Loading events…</p>
      <UiActivityFeed v-else-if="events.length">
        <UiActivityItem
          v-for="ev in events"
          :key="ev.txDigest"
          :type="eventLabel[ev.type]"
          :time="`ckpt ${ev.checkpoint ?? '?'}`"
        />
      </UiActivityFeed>
      <p v-else class="dao-placeholder">No recent events.</p>
    </UiPanel>
  </div>
</template>
