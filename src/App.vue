<script setup lang="ts">
// Standalone shell for the Treasury SPA. The core UI lives in TreasuryView.vue (also
// exported for inline embedding in the dashboard).
import { AppFooter, AppHeader, ColorModeControl, CopyrightLine, UiAppShell, UiBadge, useColorMode } from '@meddleware/ui'
import { network } from './config.js'
import TreasuryView from './TreasuryView.vue'

const { mode, set } = useColorMode('dark')
const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'https://docs.meddleware.co.uk/blockchain/sui/treasury/'
const DEV_URL = import.meta.env.VITE_DEV_URL || 'https://meddleware.dev/sui/'
</script>

<template>
  <UiAppShell contained>
    <template #header>
      <AppHeader variant="dark">
        <template #brand>Meddleware Treasury</template>
        <template #actions>
          <UiBadge tone="info" :symbol="false">{{ network }}</UiBadge>
          <ColorModeControl :model-value="mode" @update:model-value="set" />
        </template>
      </AppHeader>
    </template>

    <h1 class="mw-visually-hidden">Meddleware Treasury</h1>
    <TreasuryView />

    <template #footer>
      <AppFooter :docs-url="DOCS_URL" :dev-url="DEV_URL">
        <template #start>
          <CopyrightLine symbol-variant="kopimi" organisation-name="Meddleware" rights-statement="jam" />
        </template>
      </AppFooter>
    </template>
  </UiAppShell>
</template>
