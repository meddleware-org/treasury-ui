<script setup lang="ts">
// Core Treasury tool UI — a desktop-console accounting view over the organisation's
// on-chain treasury. Rendered standalone by App.vue and exported for inline embedding
// in the dashboard. All reads are read-only; no wallet connection is required.
//
// Framing: the treasury is organisation-level. Blockchain (Sui today) is one revenue
// stream among potentially many — the tabs are structured so more can be added later.
// There is deliberately no governance/proposals surface here (that lives in dao-ui).
import { computed, ref } from 'vue'
import { AppTabNav, UiNotice, UiStatusBar, UiTabPanel, type AppTab } from '@meddleware/ui'
import OverviewTab from './tabs/OverviewTab.vue'
import AccountsTab from './tabs/AccountsTab.vue'
import ActivityTab from './tabs/ActivityTab.vue'
import { useTreasuryActivity } from './composables/useTreasuryActivity.js'
import { useEpoch } from './composables/useEpoch.js'
import { isDeployed, notAvailableOn } from './availability.js'
import { network } from './config.js'

const TABS: AppTab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'activity', label: 'Activity' },
]

const activeTab = ref('overview')

// A network with no recorded deployment (the records decide, not prose) is not offered: say so and what to do, instead of tabs of empty cells.
const unavailable = computed(() => (isDeployed(network.value) ? null : notAvailableOn(network.value)))

const TAB_COMPONENTS = {
  overview: OverviewTab,
  accounts: AccountsTab,
  activity: ActivityTab,
}

const activeComponent = computed(() => TAB_COMPONENTS[activeTab.value as keyof typeof TAB_COMPONENTS])

// The status bar and the tabs share one feed and one epoch: opening a tab does not fetch them again.
const { lastRefresh, error: eventsError } = useTreasuryActivity()
const { epoch } = useEpoch()
</script>

<template>
  <section class="treasury-view" aria-labelledby="treasury-title">
    <h2 id="treasury-title"><span aria-hidden="true">🏦</span> Meddleware Treasury</h2>

    <UiNotice v-if="unavailable" :message="unavailable" />
    <template v-else>
      <AppTabNav v-model="activeTab" :tabs="TABS" id-prefix="treasury" variant="raised" aria-label="Treasury sections" />

      <UiTabPanel id-prefix="treasury" :tab="activeTab">
        <component :is="activeComponent" />
      </UiTabPanel>
    </template>

    <UiStatusBar :network="network" :healthy="!eventsError" :epoch="epoch" :last-refresh="lastRefresh" />
  </section>
</template>

<style scoped>
.treasury-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-xs);
  min-height: 0;
  flex: 1;
}

h2 {
  margin: 0;
  font-size: var(--font-size-md);
}
</style>
