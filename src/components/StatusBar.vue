<script setup lang="ts">
// Bottom status bar: network + health dot (error-driven), current epoch, and a
// relative "refreshed Ns ago" timestamp. Built on the shared UiStatusBar/UiStatusDot.
import { computed } from 'vue'
import { UiStatusBar, UiStatusDot } from '@meddleware/ui'
import { NETWORK } from '../config.js'

const props = defineProps<{
  epoch: number | null
  lastRefresh: Date | null
  error?: boolean
}>()

const dotStatus = computed<'ok' | 'error'>(() => (props.error ? 'error' : 'ok'))

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  return `${Math.floor(s / 60)}m ago`
}
</script>

<template>
  <UiStatusBar>
    <span class="mw-statusbar__item">
      <UiStatusDot :status="dotStatus" />
      {{ NETWORK.charAt(0).toUpperCase() + NETWORK.slice(1) }}
    </span>
    <span class="mw-statusbar__sep">│</span>
    <span v-if="epoch !== null" class="mw-statusbar__item">Epoch {{ epoch }}</span>
    <span v-else class="mw-statusbar__item dao-muted">Epoch —</span>
    <span class="mw-statusbar__sep">│</span>
    <span v-if="lastRefresh" class="mw-statusbar__item">Refreshed {{ timeAgo(lastRefresh) }}</span>
    <span v-else class="mw-statusbar__item dao-muted">Loading…</span>
  </UiStatusBar>
</template>
