/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NETWORK?: string
  readonly VITE_RPC_TESTNET?: string
  readonly VITE_RPC_MAINNET?: string
  readonly VITE_ACCESS_GATE_PACKAGE_ID_TESTNET?: string
  readonly VITE_ACCESS_GATE_PACKAGE_ID_MAINNET?: string
  readonly VITE_PLATFORM_CONFIG_ID_TESTNET?: string
  readonly VITE_PLATFORM_CONFIG_ID_MAINNET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
