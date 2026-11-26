<script setup lang="ts">
// The Accounts tab: the treasury account (fee rate, balance, address) and the table of gates it administers (found through AdminCap ownership).
// Read-only. Related: TreasuryView.vue (hosts it), composables/usePlatformConfig.ts, useTreasury.ts and useGates.ts (the reads).
// Vue's `computed`, for the list of problems.
import { computed } from 'vue'
// The shared building blocks: copy and explorer links for addresses, amounts, the table, notices and the panel and stat layouts.
import { CopyableAddress, ExplorerLink, UiAmount, UiDataTable, UiEmptyState, UiLiveStatus, UiNotice, UiPanel, UiStatGrid, UiStatRow } from '@meddleware/ui'
// Builds a block-explorer link for an address or an object.
import { suiExplorerUrl } from '@meddleware/web-utils'
// The platform settings: the treasury address and the fee rate.
import { usePlatformConfig } from '../composables/usePlatformConfig.js'
// The treasury's balance.
import { useTreasury } from '../composables/useTreasury.js'
// The gates the treasury administers.
import { useGates } from '../composables/useGates.js'
// Collapses identical messages into one line.
import { distinct } from '../availability.js'
// The network the explorer links point to.
import { explorerNetwork } from '../config.js'

// The platform settings, with their state.
const { config, loading: cfgLoading, error: cfgErr, commissionPct } = usePlatformConfig()
// The balance follows the treasury address as soon as it is known.
const { balance, error: balanceErr } = useTreasury(() => config.value?.treasury ?? null)
// The gates, with their state.
const { gates, loading: gatesLoading, error: gatesErr } = useGates()

// What could not be read, in words (one line each, however many reads failed the same way).
// What could not be read, in words (one line each, however many reads failed the same way).
const accountProblems = computed(() => distinct(cfgErr.value, balanceErr.value))
</script>

<template>
  <div class="accounts">
    <!-- The treasury account: fee rate, balance and address. -->
    <UiPanel title="Sui Treasury Account">
      <!-- A polite live region, so a screen reader is told when loading starts and ends. -->
      <UiLiveStatus label="Treasury account" :message="cfgLoading ? 'Loading…' : ''" />
      <!-- One error notice per distinct problem. -->
      <UiNotice v-for="problem in accountProblems" :key="problem" type="error" :message="problem" />
      <!-- The three figures, once the settings are read. -->
      <UiStatGrid v-if="config">
        <!-- The commission the platform takes, as a percentage. -->
        <UiStatRow label="Platform fee rate">{{ commissionPct }}</UiStatRow>
        <!-- The balance in SUI (the amount component formats MIST). -->
        <UiStatRow label="Current balance"><UiAmount :value="balance" /></UiStatRow>
        <!-- The full address, with a copy button and an explorer link. -->
        <UiStatRow label="Treasury address" align="left">
          <CopyableAddress :address="config.treasury" :truncate="false">
            <ExplorerLink :href="suiExplorerUrl('account', config.treasury, explorerNetwork)" :value="config.treasury" :truncate="false" />
          </CopyableAddress>
        </UiStatRow>
      </UiStatGrid>
      <!-- Nothing read yet and no failure to report. -->
      <UiEmptyState v-else-if="!cfgLoading && !cfgErr">No platform settings to show yet.</UiEmptyState>
    </UiPanel>

    <!-- The gates whose AdminCaps the treasury owns. -->
    <UiPanel title="Revenue Sources">
      <!-- Announces loading to assistive technology. -->
      <UiLiveStatus label="Revenue sources" :message="gatesLoading ? 'Loading gates…' : ''" />
      <!-- The gates could not be read. -->
      <UiNotice v-if="gatesErr" type="error" :message="gatesErr" />
      <!-- The gate table; empty text and the row count let the component show its empty state. -->
      <UiDataTable v-else-if="!gatesLoading" caption="Gates the treasury controls" empty="No gates found." :rows="gates.length">
        <!-- The column headings, each scoped to its column. -->
        <template #head>
          <th scope="col">Gate name</th>
          <th scope="col">Price</th>
          <th scope="col">Object ID</th>
        </template>
        <!-- One row per gate; the name is the row header. -->
        <tr v-for="gate in gates" :key="gate.id">
          <th scope="row">{{ gate.name }}</th>
          <!-- The price, formatted from MIST. -->
          <td><UiAmount :value="gate.price" /></td>
          <td>
            <!-- The gate's object id, copyable and linked to the explorer. -->
            <CopyableAddress :address="gate.id" label="Copy object ID">
              <ExplorerLink :href="suiExplorerUrl('object', gate.id, explorerNetwork)" :value="gate.id" />
            </CopyableAddress>
          </td>
        </tr>
      </UiDataTable>
    </UiPanel>
  </div>
</template>

<style scoped>
/* A column with the shared small gap between the panels. */
.accounts {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
</style>
