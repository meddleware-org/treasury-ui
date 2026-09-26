// Build-time configuration. All chain ids are read from VITE_* env with working
// testnet defaults; mainnet ids stay empty until deployment (set the _MAINNET vars —
// no code change needed). PACKAGE_ID / CONFIG_ID / RPC_URL resolve to the active network.
export type Network = 'testnet' | 'mainnet'

export const NETWORK: Network = (import.meta.env.VITE_NETWORK as Network) || 'testnet'

export const RPC_URLS: Record<Network, string> = {
  testnet: import.meta.env.VITE_RPC_TESTNET || 'https://fullnode.testnet.sui.io:443',
  mainnet: import.meta.env.VITE_RPC_MAINNET || 'https://fullnode.mainnet.sui.io:443',
}

/** Published access_gate package ID. Governs which events/objects are queried. */
export const ACCESS_GATE_PACKAGE_ID: Record<Network, string> = {
  testnet:
    import.meta.env.VITE_ACCESS_GATE_PACKAGE_ID_TESTNET ||
    '0x0bedd0b27d993d3292ca6a5315f7562de8bc0ff3752b445b4c53252c76f2d20d',
  mainnet: import.meta.env.VITE_ACCESS_GATE_PACKAGE_ID_MAINNET || '',
}

/** PlatformConfig shared object ID — holds commission_bps + treasury address. */
export const PLATFORM_CONFIG_ID: Record<Network, string> = {
  testnet:
    import.meta.env.VITE_PLATFORM_CONFIG_ID_TESTNET ||
    '0x7c5aed0ce7f29a4dfb60657858df31c12410a67098b4bcdd1d8cb1e531be4884',
  mainnet: import.meta.env.VITE_PLATFORM_CONFIG_ID_MAINNET || '',
}

export const PACKAGE_ID = ACCESS_GATE_PACKAGE_ID[NETWORK]
export const CONFIG_ID = PLATFORM_CONFIG_ID[NETWORK]
export const RPC_URL = RPC_URLS[NETWORK]
