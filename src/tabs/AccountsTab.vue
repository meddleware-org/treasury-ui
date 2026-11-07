<script setup lang="ts">
// Treasury tab: commission rate + live SUI balance + treasury address, plus the table
// of Community Gates the treasury controls (discovered via AdminCap ownership).
import { computed } from 'vue'
import { CopyableAddress, ExplorerLink, UiAmount, UiDataTable, UiEmptyState, UiLiveStatus, UiNotice, UiPanel, UiStatGrid, UiStatRow } from '@meddleware/ui'
import { suiExplorerUrl } from '@meddleware/web-utils'
import { usePlatformConfig } from '../composables/usePlatformConfig.js'
import { useTreasury } from '../composables/useTreasury.js'
import { useGates } from '../composables/useGates.js'
import { distinct } from '../availability.js'
import { explorerNetwork } from '../config.js'

const { config, loading: cfgLoading, error: cfgErr, commissionPct } = usePlatformConfig()
const { balance, error: balanceErr } = useTreasury(() => config.value?.treasury ?? null)
const { gates, loading: gatesLoading, error: gatesErr } = useGates()

// What could not be read, in words (one line each, however many reads failed the same way).
const accountProblems = computed(() => distinct(cfgErr.value, balanceErr.value))
</script>

<template>
  <div class="accounts">
    <UiPanel title="Sui Treasury Account">
      <UiLiveStatus label="Treasury account" :message="cfgLoading ? 'Loading…' : ''" />
      <UiNotice v-for="problem in accountProblems" :key="problem" type="error" :message="problem" />
      <UiStatGrid v-if="config">
        <UiStatRow label="Commission rate">{{ commissionPct }}</UiStatRow>
        <UiStatRow label="Current balance"><UiAmount :value="balance" /></UiStatRow>
        <UiStatRow label="Treasury address" align="left">
          <CopyableAddress :address="config.treasury" :truncate="false">
            <ExplorerLink :href="suiExplorerUrl('account', config.treasury, explorerNetwork)" :value="config.treasury" :truncate="false" />
          </CopyableAddress>
        </UiStatRow>
      </UiStatGrid>
      <UiEmptyState v-else-if="!cfgLoading && !cfgErr">No platform settings to show yet.</UiEmptyState>
    </UiPanel>

    <UiPanel title="Revenue Sources">
      <UiLiveStatus label="Revenue sources" :message="gatesLoading ? 'Loading gates…' : ''" />
      <UiNotice v-if="gatesErr" type="error" :message="gatesErr" />
      <UiDataTable v-else-if="!gatesLoading" caption="Gates the treasury controls" empty="No gates found." :rows="gates.length">
        <template #head>
          <th scope="col">Gate name</th>
          <th scope="col">Price</th>
          <th scope="col">Object ID</th>
        </template>
        <tr v-for="gate in gates" :key="gate.id">
          <th scope="row">{{ gate.name }}</th>
          <td><UiAmount :value="gate.price" /></td>
          <td>
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
.accounts {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}
</style>
