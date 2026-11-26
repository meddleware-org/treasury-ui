<script setup lang="ts">
// The treasury console: an accounting view over the organisation's on-chain treasury (overview, accounts, activity) with a status bar.
// Rendered standalone by App.vue and exported from src/index.ts for inline embedding in the dashboard. Every read is read-only and no wallet connection is needed.
// The treasury is organisation-level: Sui is one revenue stream among potentially many, so the tabs leave room for more. There is deliberately no governance
// surface here; that lives in dao-ui.
// Vue's reactivity.
import { computed, ref } from 'vue'
// The tab list and panel, the notice and the status bar from the shared UI.
import { AppTabNav, UiNotice, UiStatusBar, UiTabPanel, type AppTab } from '@meddleware/ui'
// The three tabs.
import OverviewTab from './tabs/OverviewTab.vue'
import AccountsTab from './tabs/AccountsTab.vue'
import ActivityTab from './tabs/ActivityTab.vue'
// The event feed (the status bar's last-refresh time and health come from it).
import { useTreasuryActivity } from './composables/useTreasuryActivity.js'
// The current epoch, for the status bar.
import { useEpoch } from './composables/useEpoch.js'
// `isDeployed` and `notAvailableOn` decide whether this network is offered.
import { isDeployed, notAvailableOn } from './availability.js'
// The active network.
import { network } from './config.js'

// The tabs, in the order shown.
const TABS: AppTab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'activity', label: 'Activity' },
]

// The open tab; the panel shows its component.
const activeTab = ref('overview')

// A network with no recorded deployment (the records decide, not prose) is not offered: say so and what to do, instead of tabs of empty cells.
// The network has no recorded deployment: the records decide, not prose.
const unavailable = computed(() => (isDeployed(network.value) ? null : notAvailableOn(network.value)))

// Each tab's component, by id.
const TAB_COMPONENTS = {
  overview: OverviewTab,
  accounts: AccountsTab,
  activity: ActivityTab,
}

// The component for the open tab.
const activeComponent = computed(() => TAB_COMPONENTS[activeTab.value as keyof typeof TAB_COMPONENTS])

// The status bar and the tabs share one feed and one epoch: opening a tab does not fetch them again.
// The status bar and the tabs share one feed and one epoch: opening a tab does not fetch them again.
const { lastRefresh, error: eventsError } = useTreasuryActivity()
// The epoch, or null until known.
const { epoch } = useEpoch()
</script>

<template>
  <section class="treasury-view" aria-labelledby="treasury-title">
    <!-- The emoji is decoration, hidden from assistive technology. -->
    <h2 id="treasury-title"><span aria-hidden="true">🏦</span> Meddleware Treasury</h2>

    <!-- Where no deployment is recorded, say so and what to do instead of showing empty tabs. -->
    <UiNotice v-if="unavailable" :message="unavailable" />
    <template v-else>
      <!-- The three tabs; the id prefix ties each tab to its panel. -->
      <AppTabNav v-model="activeTab" :tabs="TABS" id-prefix="treasury" variant="raised" aria-label="Treasury sections" />

      <!-- The panel of the open tab. -->
      <UiTabPanel id-prefix="treasury" :tab="activeTab">
        <!-- The open tab's component. -->
        <component :is="activeComponent" />
      </UiTabPanel>
    </template>

    <!-- The network, health, epoch and last refresh, always visible. -->
    <UiStatusBar :network="network" :healthy="!eventsError" :epoch="epoch" :last-refresh="lastRefresh" />
  </section>
</template>

<style scoped>
/* A column that fills the available height so the status bar stays at the bottom. */
.treasury-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-xs);
  min-height: 0;
  flex: 1;
}

/* The title: no margin, a medium size from the tokens. */
h2 {
  margin: 0;
  font-size: var(--font-size-md);
}
</style>
