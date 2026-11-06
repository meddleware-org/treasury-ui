import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { assertE2eOnlyInE2eMode, themeInit, viteTarget } from '@meddleware/frontend-config/vite'

export default defineConfig(({ mode }) => {
  // The end-to-end build (`--mode e2e`) includes a mock wallet and a stub chain; nothing else may.
  assertE2eOnlyInE2eMode(mode)
  return {
    build: { target: viteTarget() },
    plugins: [vue(), themeInit({ default: 'dark' })],
    optimizeDeps: {
      // @meddleware/wallet-adapter ships TS + .vue source and holds the shared wallet singleton; if it
      // were pre-bundled, its .vue files (served raw) would load a second copy of the singleton in dev.
      exclude: ['@meddleware/wallet-adapter'],
    },
  }
})
