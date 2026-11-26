// Vite configuration: the fleet's shared application settings from @meddleware/frontend-config with the Vue plugin and the page name `Treasury`.
// `npm run dev` and `npm run build` read it; the end-to-end build is `vite build --mode e2e` (npm run build:e2e).
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { meddlewareApp } from '@meddleware/frontend-config/vite'

// meddlewareApp refuses VITE_E2E outside the end-to-end mode (`--mode e2e`: a mock wallet and a stub chain; nothing else may include them)
// and keeps @meddleware/wallet-adapter (the shared wallet singleton) out of pre-bundling.
export default defineConfig(meddlewareApp({ plugins: [vue()], name: 'Treasury' }))
