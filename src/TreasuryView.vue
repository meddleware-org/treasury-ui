<script setup lang="ts">
// Core Treasury tool UI — a desktop-console accounting view over the organisation's
// on-chain treasury. Rendered standalone by App.vue and exported for inline embedding
// in the dashboard. All reads are read-only; no wallet connection is required.
//
// Framing: the treasury is organisation-level. Blockchain (Sui today) is one revenue
// stream among potentially many — the tabs are structured so more can be added later.
// There is deliberately no governance/proposals surface here (that lives in dao-ui).
//
// qt.css is imported here (not just in main.ts) so the styles are included when the
// view is consumed as a library by the dashboard or any other host.
import './styles/qt.css'
import { ref, computed } from 'vue'
import { UiToolbar, UiToolbarButton } from '@meddleware/ui'
import TabBar from './components/TabBar.vue'
import StatusBar from './components/StatusBar.vue'
import OverviewTab from './tabs/OverviewTab.vue'
import AccountsTab from './tabs/AccountsTab.vue'
import ActivityTab from './tabs/ActivityTab.vue'
import { useTreasuryActivity } from './composables/useTreasuryActivity.js'
import { useEpoch } from './composables/useEpoch.js'

import type { Tab } from './components/TabBar.vue'

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'activity', label: 'Activity' },
]

const activeTab = ref('overview')

const TAB_COMPONENTS = {
  overview: OverviewTab,
  accounts: AccountsTab,
  activity: ActivityTab,
}

const activeComponent = computed(
  () => TAB_COMPONENTS[activeTab.value as keyof typeof TAB_COMPONENTS],
)

const { lastRefresh, error: eventsError } = useTreasuryActivity(1)
const { epoch } = useEpoch()
</script>

<template>
  <div class="dao-view">
    <UiToolbar>
      <UiToolbarButton @click="activeTab = 'overview'">🏦 Meddleware Treasury</UiToolbarButton>
    </UiToolbar>

    <TabBar :tabs="TABS" v-model="activeTab" />

    <div class="dao-content">
      <component :is="activeComponent" />
    </div>

    <StatusBar :epoch="epoch" :last-refresh="lastRefresh" :error="!!eventsError" />
  </div>
</template>
