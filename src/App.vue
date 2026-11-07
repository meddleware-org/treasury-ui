<script setup lang="ts">
// Standalone shell for the Treasury SPA: the shared tool shell (header, colour mode, footer) around the core tool view.
// The core UI lives in TreasuryView.vue (also exported for inline embedding in the dashboard).
import { AppToolShell, UiBadge } from '@meddleware/ui'
import { network } from './config.js'
import TreasuryView from './TreasuryView.vue'

const DOCS_URL = import.meta.env.VITE_DOCS_URL || undefined
// The developer site has no treasury page: its Sui section is the landing point.
const DEV_URL = import.meta.env.VITE_DEV_URL || 'https://meddleware.dev/sui/'
</script>

<template>
  <AppToolShell title="Treasury" slug="treasury" :docs-url="DOCS_URL" :dev-url="DEV_URL">
    <template #actions>
      <UiBadge tone="info" :symbol="false">{{ network }}</UiBadge>
    </template>

    <TreasuryView />
  </AppToolShell>
</template>
