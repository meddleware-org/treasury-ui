import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    // @meddleware/wallet-adapter ships TS + .vue source and holds the shared wallet singleton; if it
    // were pre-bundled, its .vue files (served raw) would load a second copy of the singleton in dev.
    exclude: ['@meddleware/wallet-adapter'],
  },
})
