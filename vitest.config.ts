import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'
import { vueTestConfig } from '@meddleware/frontend-config/vitest'

// Unit and component tests: the read-only composables (event merge, gate null-filtering), the plain availability messages, the wording of every
// template, and the explorer-URL scheme safety. jsdom hosts the Vue reactivity and the mounts. The real-browser gate lives in e2e/ (Playwright).
export default defineConfig(vueTestConfig({ plugins: [vue()] }))
