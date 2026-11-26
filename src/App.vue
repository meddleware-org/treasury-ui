<script setup lang="ts">
// The standalone Treasury page: the shared tool shell around the console view, with the network badge in the header.
// The console itself is TreasuryView.vue (also exported from src/index.ts for the dashboard to embed). Related: src/main.ts mounts this component.
// The shared tool shell (header, colour mode, footer) and the badge that shows the network.
import { AppToolShell, UiBadge } from '@meddleware/ui'
// The active network, shown in the header.
import { network } from './config.js'
// The console itself.
import TreasuryView from './TreasuryView.vue'

// Optional documentation link for the shell; unset hides it.
const DOCS_URL = import.meta.env.VITE_DOCS_URL || undefined
// Optional developer-documentation link; unset hides it.
const DEV_URL = import.meta.env.VITE_DEV_URL || undefined
</script>

<template>
  <AppToolShell title="Treasury" slug="treasury" :docs-url="DOCS_URL" :dev-url="DEV_URL">
    <!-- The header's action slot carries the network badge. -->
    <template #actions>
      <!-- The network the page reads (testnet today). -->
      <UiBadge tone="info" :symbol="false">{{ network }}</UiBadge>
    </template>

    <!-- The console: overview, accounts and activity tabs. -->
    <TreasuryView />
  </AppToolShell>
</template>
