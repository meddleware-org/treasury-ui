import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Unit tests for the read-only composables (event merge, gate null-filtering, proposals stub) plus
// the explorer-URL scheme safety. jsdom hosts the Vue reactivity; dedupe keeps a single Vue runtime.
export default defineConfig({
  plugins: [vue()],
  resolve: { dedupe: ['vue', '@vue/test-utils'] },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules/**'],
  },
})
