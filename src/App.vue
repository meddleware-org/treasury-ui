<script setup lang="ts">
// Standalone shell for the Treasury SPA. The core UI lives in TreasuryView.vue (also
// exported for inline embedding in the dashboard).
import { AppHeader, AppFooter, ColorModeControl, CopyrightLine, useColorMode } from '@meddleware/ui'
import { network } from './config.js'
import TreasuryView from './TreasuryView.vue'

const { mode, set } = useColorMode('dark')
const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'https://docs.meddleware.co.uk/blockchain/sui/treasury/'
const DEV_URL = import.meta.env.VITE_DEV_URL || 'https://dev.meddleware.co.uk/sui/access-gate/'
</script>

<template>
  <div class="app">
    <AppHeader variant="dark">
      <template #brand>
        <h1 class="brand-title">Meddleware Treasury</h1>
      </template>
      <template #actions>
        <span class="network-badge">{{ network }}</span>
        <ColorModeControl :model-value="mode" @update:model-value="set" />
      </template>
    </AppHeader>

    <TreasuryView />

    <AppFooter :docs-url="DOCS_URL" :dev-url="DEV_URL">
      <template #start>
        <CopyrightLine symbol-variant="kopimi" organisation-name="Meddleware" rights-statement="jam" />
      </template>
    </AppFooter>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.brand-title {
  font: inherit;
  margin: 0;
}

.network-badge {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 2px;
  border: 1px solid var(--border);
  color: var(--muted);
  font-family: var(--mw-font-mono);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
