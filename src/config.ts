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
    '0x1a81ca177db039585e575beeeee4759466e55910e936a6733e38dbb65025eea4',
  mainnet: import.meta.env.VITE_ACCESS_GATE_PACKAGE_ID_MAINNET || '',
}

/** PlatformConfig shared object ID — holds commission_bps + treasury address. */
export const PLATFORM_CONFIG_ID: Record<Network, string> = {
  testnet:
    import.meta.env.VITE_PLATFORM_CONFIG_ID_TESTNET ||
    '0xe3b949cabe9a0574c03dfc924fb3f96e6f959f2bb86d053ed6229a241c3a23f7',
  mainnet: import.meta.env.VITE_PLATFORM_CONFIG_ID_MAINNET || '',
}

export const PACKAGE_ID = ACCESS_GATE_PACKAGE_ID[NETWORK]
export const CONFIG_ID = PLATFORM_CONFIG_ID[NETWORK]
export const RPC_URL = RPC_URLS[NETWORK]
